/**
 * Shop Detail Screen – Products, services, and cart management
 * 
 * ORDER TRACKING:
 * - When user adds products to cart, they are stored locally in cart store
 * - An order is created ONCE when user navigates to checkout (with location)
 * - OrderId is stored in cart store (persists across navigation)
 * - If user returns and adds more products, the same orderId is used
 * - Products are added/removed from cart, and order is finalized at checkout
 * - This ensures only ONE order per cart session, not multiple orders
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useCartStore } from '@/store/cart.store';
import { ordersApi, DeliveryQuoteOption } from '@/api/orders.api';
import { sellersApi } from '@/api/sellers.api';
import { productsApi, Product } from '@/api/products.api';
import { Loader } from '@/components/Loader';


export default function ShopDetailScreen() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [fileMetadata, setFileMetadata] = useState<{[key: string]: {pages: number; preview?: string}}>({});
  const [detectingPages, setDetectingPages] = useState<{[key: string]: boolean}>({});
  
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setSelectedSeller = useCartStore((state) => state.setSelectedSeller);
  const cartOrderId = useCartStore((state) => state.orderId); // Get orderId
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotal());

  // Fetch seller details from API
  const { data: sellerData, isLoading: sellerLoading, isError: sellerError } = useQuery({
    queryKey: ['seller', shopId],
    queryFn: () => sellersApi.getSeller(shopId as string),
    enabled: Boolean(shopId),
  });

  // Fetch products from API
  const { data: productsData, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['sellerProducts', shopId],
    queryFn: () => productsApi.getSellerProducts(shopId as string),
    enabled: Boolean(shopId),
  });

  // Normalize seller data
  const shopInfo = useMemo(() => {
    if (sellerLoading) {
      return {
        id: shopId,
        name: 'Loading shop...',
        rating: 4.8,
        reviews: 0,
        distance: 'N/A',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80',
      };
    }
    if (sellerError || !sellerData) {
      return {
        id: shopId,
        name: shopId ? `Shop ${shopId}` : 'Unknown Shop',
        rating: 4.8,
        reviews: 0,
        distance: 'N/A',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80',
      };
    }
    return {
      id: sellerData.id,
      name: sellerData.shopName,
      rating: 4.8,
      reviews: 120,
      distance: 'N/A',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80',
    };
  }, [sellerData, sellerError, sellerLoading, shopId]);

  // Normalize products data - only use API data
  const products = useMemo(() => {
    const sellerId = Array.isArray(shopId) ? shopId[0] : shopId;
    // Return only API data, no fallback to demo products
    if (!productsData || productsData.length === 0) {
      return [];
    }
    return productsData.map(p => ({
      ...p,
      sellerId: sellerId || p.sellerId,
    }));
  }, [productsData, shopId]);

  // Get unique categories from products
  const productCategories = useMemo(() => {
    const categories = [...new Set(products.map(p => p.category))];
    return categories.sort();
  }, [products]);

  // Check if shop is a printing service shop
  const isPrintingShop = useMemo(() => {
    return products.some(p => p.category === 'Printing Services');
  }, [products]);

  // Reset activeTab if it doesn't exist in current categories
  useEffect(() => {
    if (activeTab !== 'all' && !productCategories.includes(activeTab)) {
      setActiveTab('all');
    }
  }, [productCategories]);

  // Set seller immediately when taking shopId from route
  // This ensures seller is always selected, even before API responds
  useEffect(() => {
    if (shopId) {
      // Set seller with shopId immediately (store as temporary until API responds)
      // If API has not responded yet, use shopId as fallback name
      const sellerName = shopInfo.name && shopInfo.name !== 'Unknown Shop' 
        ? shopInfo.name 
        : `Shop ${shopId}`;
      setSelectedSeller(shopId as string, sellerName);
    }
  }, [shopId, shopInfo.name, setSelectedSeller]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.category === activeTab);
    }
    
    if (search.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered;
  }, [activeTab, search, products]);

  const handleAddProduct = (product: Product, totalPrice?: number) => {
    const result = addItem({
      id: product.id,
      sellerId: shopInfo.id,
      shopName: shopInfo.name,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category,
      totalPrice: totalPrice, // For print services
    });

    // If adding failed due to different shop, show alert
    if (!result.success && result.message) {
      Alert.alert('Cannot Add Item', result.message, [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Clear Cart & Add',
          onPress: () => {
            // Clear cart and add the item from new shop
            useCartStore.setState({
              items: [{ ...product, id: product.id, sellerId: shopInfo.id, shopName: shopInfo.name, quantity: 1, totalPrice }],
              selectedSellerId: shopInfo.id,
              selectedShopName: shopInfo.name,
              selectedDeliveryProvider: null,
              deliveryFee: null,
              paymentMethod: 'prepay',
              deliveryAddress: null,
              pickupLocation: null,
              dropLocation: null,
              orderId: null, // Reset order when clearing cart
            });
          },
        },
      ]);
    } else if (result.success) {
      // Update order if it exists
      syncOrderWithCart();
    }
  };

  /**
   * Sync cart items to the order (if order exists)
   * Called whenever cart items change
   */
  const syncOrderWithCart = async () => {
    if (!cartOrderId) {
      return; // No order yet, will be created at checkout
    }

    try {
      // Build items array from current cart
      const items = cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      if (items.length === 0) {
        // If cart is empty, we could delete the order or just skip update
        return;
      }

      // Update order with current items
      await ordersApi.updateOrder(cartOrderId, { items });
      console.log(`Order ${cartOrderId} synced with current cart`);
    } catch (error: any) {
      console.warn('Failed to sync order with cart:', error);
      // Don't fail the add operation, warn user in next screen
    }
  };

  const getProductQuantity = (productId: string) => {
    const item = cartItems.find(item => item.id === productId);
    return item?.quantity || 0;
  };

  const handleIncreaseQuantity = (productId: string) => {
    const quantity = getProductQuantity(productId);
    updateQuantity(productId, quantity + 1);
    // Sync order when quantity changes
    setTimeout(() => syncOrderWithCart(), 100);
  };

  const handleDecreaseQuantity = (productId: string) => {
    const quantity = getProductQuantity(productId);
    if (quantity > 1) {
      updateQuantity(productId, quantity - 1);
    } else {
      removeItem(productId);
    }
    // Sync order when quantity changes or item removed
    setTimeout(() => syncOrderWithCart(), 100);
  };

  const getPageCount = async (file: any): Promise<number> => {
    const fileName = file.name.toLowerCase();
    
    // For images, always 1 page
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
      return 1;
    }
    
    try {
      // For PDFs - read file and parse PDF structure
      if (fileName.endsWith('.pdf')) {
        try {
          const response = await fetch(file.uri);
          const arrayBuffer = await response.arrayBuffer();
          
          // Read PDF header to get page count
          const uint8Array = new Uint8Array(arrayBuffer);
          const pdfText = new TextDecoder().decode(uint8Array.slice(0, Math.min(10000, uint8Array.length)));
          
          // Look for /Count key which indicates number of pages
          const countMatch = pdfText.match(/\/Count\s+(\d+)/);
          if (countMatch && countMatch[1]) {
            const count = parseInt(countMatch[1], 10);
            if (count > 0) return count;
          }
          
          // Fallback: count /Page objects
          const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
          if (pageMatches) {
            return Math.max(1, pageMatches.length);
          }
          
          // If all else fails, read entire file and count
          const fullText = new TextDecoder().decode(uint8Array);
          const allPageMatches = fullText.match(/\/Type\s*\/Page\b/g);
          if (allPageMatches) {
            return Math.max(1, allPageMatches.length);
          }
        } catch (e) {
          console.log('PDF parsing error, using estimate:', e);
        }
      }
      
      // For DOCX files - extract from ZIP and parse document.xml
      if (fileName.endsWith('.docx')) {
        try {
          const response = await fetch(file.uri);
          const arrayBuffer = await response.arrayBuffer();
          
          // DOCX is a ZIP file, try to extract document.xml
          // Look for page count info in the XML
          const uint8Array = new Uint8Array(arrayBuffer);
          const text = new TextDecoder().decode(uint8Array);
          
          // Look for page count info in document properties or paragraphs
          // Count w:p tags (paragraphs) as rough page estimate
          const paragraphs = text.match(/<w:p>/g);
          if (paragraphs) {
            // Rough estimate: ~3-5 paragraphs per page in typical formatting
            const estimatedPages = Math.max(1, Math.ceil(paragraphs.length / 4));
            return Math.min(estimatedPages, Math.ceil((file.size || 0) / 1024 / 40)); // Cap to file size estimate
          }
          
          // Try to find page break markers
          const pageBreaks = text.match(/<w:br w:type="page"\/>/g) || [];
          if (pageBreaks.length > 0) {
            return pageBreaks.length + 1;
          }
        } catch (e) {
          console.log('DOCX parsing error, using estimate:', e);
        }
      }
    } catch (error) {
      console.log('Error detecting pages:', error);
    }
    
    // Final fallback: estimate based on file size
    // More conservative: ~80KB per page on average
    const sizeInKB = (file.size || 0) / 1024;
    return Math.max(1, Math.ceil(sizeInKB / 80));
  };

  const handleSelectFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
        multiple: true,
      });
      
      if (!result.canceled && result.assets) {
        const validFiles = result.assets.filter(file => {
          const sizeInMB = (file.size || 0) / (1024 * 1024);
          return sizeInMB <= 25;
        });
        
        if (validFiles.length < result.assets.length) {
          Alert.alert('File Size', 'Some files exceeded 25MB limit and were not added.');
        }
        
        // Add files immediately with placeholder metadata
        const newMetadata: {[key: string]: {pages: number; preview?: string}} = {};
        const newDetecting: {[key: string]: boolean} = {};
        
        validFiles.forEach(file => {
          const fileKey = `${file.name}-${file.size}`;
          newMetadata[fileKey] = { pages: 0 }; // Placeholder
          newDetecting[fileKey] = true;
          
          // Check if it's an image for preview
          const isImage = file.name.toLowerCase().endsWith('.jpg') || 
                         file.name.toLowerCase().endsWith('.jpeg') || 
                         file.name.toLowerCase().endsWith('.png');
          if (isImage) {
            newMetadata[fileKey].preview = file.uri;
          }
        });
        
        setUploadedFiles(prev => [...prev, ...validFiles]);
        setFileMetadata(prev => ({ ...prev, ...newMetadata }));
        setDetectingPages(prev => ({ ...prev, ...newDetecting }));
        
        // Detect page counts asynchronously
        for (const file of validFiles) {
          try {
            const pageCount = await getPageCount(file);
            const fileKey = `${file.name}-${file.size}`;
            
            setFileMetadata(prev => ({
              ...prev,
              [fileKey]: {
                ...prev[fileKey],
                pages: pageCount,
              }
            }));
            
            setDetectingPages(prev => ({
              ...prev,
              [fileKey]: false,
            }));
          } catch (error) {
            console.log('Error detecting pages for', file.name, error);
            const fileKey = `${file.name}-${file.size}`;
            setDetectingPages(prev => ({
              ...prev,
              [fileKey]: false,
            }));
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    const fileKey = `${fileToRemove.name}-${fileToRemove.size}`;
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileMetadata(prev => {
      const updated = { ...prev };
      delete updated[fileKey];
      return updated;
    });
    setDetectingPages(prev => {
      const updated = { ...prev };
      delete updated[fileKey];
      return updated;
    });
  };

  const handleCheckout = () => {
    if (itemCount > 0) {
      router.push('/checkout');
    }
  };

  const getTotalPageCount = (): number => {
    let totalPages = 0;
    uploadedFiles.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      const metadata = fileMetadata[fileKey];
      totalPages += metadata?.pages || 0;
    });
    return totalPages;
  };

  const hasFilesUploaded = (): boolean => {
    return uploadedFiles.length > 0;
  };

  const isPageDetectionComplete = (): boolean => {
    if (!hasFilesUploaded()) return false;
    
    for (const file of uploadedFiles) {
      const fileKey = `${file.name}-${file.size}`;
      const isDetecting = detectingPages[fileKey] || false;
      const pages = fileMetadata[fileKey]?.pages || 0;
      
      // If any file is still detecting or has 0 pages, detection not complete
      if (isDetecting || pages === 0) {
        return false;
      }
    }
    return true;
  };

  const calculatePrintTotal = (pricePerPage: number): number => {
    const totalPages = getTotalPageCount();
    return totalPages * pricePerPage;
  };

  const isLoading = sellerLoading || productsLoading;
  const hasError = sellerError || productsError;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <Loader />
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <MaterialIcons name="arrow-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Image source={{ uri: shopInfo.image }} style={styles.shopAvatar} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.shopTitle} numberOfLines={2}>{shopInfo.name}</Text>
            <View style={styles.shopMetaRow}>
              <MaterialIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.shopRating}>{shopInfo.rating}</Text>
              <Text style={styles.shopReviews}>({shopInfo.reviews} reviews)</Text>
              <Text style={styles.shopDistance}>{shopInfo.distance}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerIcon}>
            <MaterialIcons name="share" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* WhatsApp Button */}
        <TouchableOpacity style={styles.whatsappBtn}>
          <MaterialIcons name="chat" size={20} color={colors.textPrimary} />
          <Text style={styles.whatsappText}>Message on WhatsApp</Text>
        </TouchableOpacity>

        {/* Search and Tabs */}
        <View style={styles.searchTabsWrap}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={18} color={colors.textMuted} style={{ marginRight: spacing.xs }} />
            <TextInput
              style={styles.searchBar}
              placeholder="Search for products or services..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <View style={styles.tabsRow}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabActiveText]}>All Items</Text>
            </TouchableOpacity>
            {productCategories.map(category => (
              <TouchableOpacity 
                key={category}
                style={[styles.tab, activeTab === category && styles.tabActive]}
                onPress={() => setActiveTab(category)}
              >
                <Text style={[styles.tabText, activeTab === category && styles.tabActiveText]}>
                  {category.length > 12 ? category.substring(0, 12) + '...' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic Product Sections by Category */}
        {isPrintingShop && (
          <>
            <Text style={styles.sectionLabel}>Printing Services</Text>
            <View style={[styles.uploadBox, uploadedFiles.length > 0 && styles.uploadBoxCompact]}>
              {uploadedFiles.length === 0 && (
                <>
                  <View style={styles.uploadIconWrap}>
                    <MaterialIcons name="cloud-upload" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Document</Text>
                  <Text style={styles.uploadDesc}>PDF, DOCX or JPEG up to 25MB</Text>
                  <TouchableOpacity style={styles.uploadBtn} onPress={handleSelectFiles}>
                    <Text style={styles.uploadBtnText}>Select Files</Text>
                  </TouchableOpacity>
                </>
              )}
              {uploadedFiles.length > 0 && (
                <View style={styles.uploadedFilesHeader}>
                  <Text style={styles.uploadedSection}>Uploaded Documents ({uploadedFiles.length})</Text>
                  <TouchableOpacity onPress={handleSelectFiles} style={styles.addMoreBtn}>
                    <MaterialIcons name="add" size={18} color={colors.primary} />
                    <Text style={styles.addMoreText}>Add More</Text>
                  </TouchableOpacity>
                </View>
              )}
              {uploadedFiles.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  {uploadedFiles.map((file, index) => {
                    const fileKey = `${file.name}-${file.size}`;
                    const metadata = fileMetadata[fileKey];
                    const pages = metadata?.pages || 0;
                    const isDetecting = detectingPages[fileKey] || false;
                    const isImage = file.name.toLowerCase().endsWith('.jpg') || 
                                  file.name.toLowerCase().endsWith('.jpeg') || 
                                  file.name.toLowerCase().endsWith('.png');
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                    
                    return (
                      <View key={index} style={styles.uploadedFileCard}>
                        {/* Preview */}
                        <View style={styles.filePreviewWrap}>
                          {isImage && metadata?.preview ? (
                            <Image 
                              source={{ uri: metadata.preview }} 
                              style={styles.filePreviewImg}
                              resizeMode="cover"
                            />
                          ) : isPdf ? (
                            <View style={styles.filePreviewPlaceholder}>
                              <MaterialIcons name="picture-as-pdf" size={36} color={colors.primary} />
                            </View>
                          ) : (
                            <View style={styles.filePreviewPlaceholder}>
                              <MaterialIcons name="description" size={36} color={colors.primary} />
                            </View>
                          )}
                          {isDetecting ? (
                            <View style={styles.pageBadgeLoading}>
                              <Text style={styles.pageBadgeText}>...</Text>
                            </View>
                          ) : (
                            <View style={styles.pageBadge}>
                              <Text style={styles.pageBadgeText}>{pages}p</Text>
                            </View>
                          )}
                        </View>
                        
                        {/* File Info */}
                        <View style={styles.fileInfo}>
                          <Text style={styles.uploadedFileName} numberOfLines={2}>{file.name}</Text>
                          <View style={styles.fileMetaRow}>
                            <Text style={styles.uploadedFileSize}>{((file.size || 0) / 1024).toFixed(1)} KB</Text>
                            {isDetecting ? (
                              <Text style={styles.filePagesText}>• Detecting...</Text>
                            ) : (
                              <Text style={styles.filePagesText}>• {pages} page{pages > 1 ? 's' : ''}</Text>
                            )}
                          </View>
                        </View>
                        
                        {/* Remove Button */}
                        <TouchableOpacity 
                          style={styles.removeFileBtn}
                          onPress={() => handleRemoveFile(index)}
                        >
                          <MaterialIcons name="close" size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            
            {filteredProducts.filter(p => p.category === 'Printing Services').map(product => {
              const quantity = getProductQuantity(product.id);
              const totalPages = getTotalPageCount();
              const totalAmount = calculatePrintTotal(product.price);
              const canAdd = hasFilesUploaded() && isPageDetectionComplete();
              const addBtnDisabled = !canAdd || quantity > 0;
              
              return (
                <View key={product.id} style={styles.printServiceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.printServiceTitle}>{product.name}</Text>
                    <Text style={styles.printServiceDesc}>{product.description}</Text>
                    <View style={styles.printPriceRow}>
                      <Text style={styles.printServicePrice}>₹{product.price.toFixed(2)}/page</Text>
                      {canAdd && (
                        <Text style={styles.printTotalPages}>• {totalPages} pages</Text>
                      )}
                    </View>
                    {canAdd && (
                      <Text style={styles.printTotalAmount}>Total: ₹{totalAmount.toFixed(2)}</Text>
                    )}
                    {!canAdd && hasFilesUploaded() && !isPageDetectionComplete() && (
                      <Text style={styles.printDetecting}>Detecting document pages...</Text>
                    )}
                    {!hasFilesUploaded() && (
                      <Text style={styles.printNoFiles}>Upload a document to add to cart</Text>
                    )}
                  </View>
                  {quantity > 0 ? (
                    <View style={styles.quantityAdjuster}>
                      <TouchableOpacity 
                        style={styles.quantityBtn}
                        onPress={() => handleDecreaseQuantity(product.id)}
                      >
                        <MaterialIcons name="remove" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity 
                        style={styles.quantityBtn}
                        onPress={() => handleIncreaseQuantity(product.id)}
                      >
                        <MaterialIcons name="add" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.addBtn, addBtnDisabled && styles.addBtnDisabled]}
                      onPress={() => handleAddProduct(product, totalAmount)}
                      disabled={addBtnDisabled}
                    >
                      <MaterialIcons name="add" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Other Product Categories */}
        {productCategories.filter(cat => cat !== 'Printing Services').map(category => {
          const categoryProducts = filteredProducts.filter(p => p.category === category);
          if (categoryProducts.length === 0) return null;

          return (
            <View key={category}>
              <Text style={styles.sectionLabel}>{category}</Text>
              <View style={styles.productsGrid}>
                {categoryProducts.map(product => {
                  const quantity = getProductQuantity(product.id);
                  return (
                    <View key={product.id} style={styles.productCard}>
                      <Image source={{ uri: product.image }} style={styles.productImg} />
                      <TouchableOpacity style={styles.productFav}>
                        <MaterialIcons name="favorite-border" size={16} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productDesc}>{product.description}</Text>
                      <View style={styles.productRow}>
                        <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                        {quantity > 0 ? (
                          <View style={styles.quantityAdjusterSm}>
                            <TouchableOpacity 
                              style={styles.quantityBtnSm}
                              onPress={() => handleDecreaseQuantity(product.id)}
                            >
                              <MaterialIcons name="remove" size={14} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.quantityTextSm}>{quantity}</Text>
                            <TouchableOpacity 
                              style={styles.quantityBtnSm}
                              onPress={() => handleIncreaseQuantity(product.id)}
                            >
                              <MaterialIcons name="add" size={14} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.addBtnSm}
                            onPress={() => handleAddProduct(product)}
                          >
                            <MaterialIcons name="add" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
      )}

      {/* Cart Bar - Floating */}
      {itemCount > 0 && (
        <View style={styles.cartBarContainer}>
          <TouchableOpacity 
            style={styles.cartBar}
            onPress={() => router.push('/checkout')}
            activeOpacity={0.8}
          >
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartBarLabel}>{itemCount} item{itemCount > 1 ? 's' : ''} added</Text>
              <Text style={styles.cartBarAction}>View Cart</Text>
            </View>
            <Text style={styles.cartBarTotal}>₹{subtotal.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  shopAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceDark,
  },
  shopTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs - 2,
  },
  shopRating: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginLeft: spacing.xxs,
    fontSize: 13,
  },
  shopReviews: {
    color: colors.textMuted,
    marginLeft: spacing.xxs,
    fontSize: 12,
  },
  shopDistance: {
    color: colors.textMuted,
    marginLeft: spacing.xs,
    fontSize: 12,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  whatsappText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: spacing.sm,
  },
  searchTabsWrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  searchBar: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: 999,
    backgroundColor: colors.surfaceDark,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  tabActiveText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  sectionLabel: {
    ...typography.sectionHeader,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  uploadBoxCompact: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  uploadIconWrap: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  uploadTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: spacing.xs - 2,
  },
  uploadDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  uploadBtnText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  printServiceCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  printServiceTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  printServiceDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  printServicePrice: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: spacing.xxs,
  },
  printPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  printTotalPages: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  printTotalAmount: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: spacing.sm,
  },
  printDetecting: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  printNoFiles: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  addBtnDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  cartBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cartBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cartBadgeText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartBarLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cartBarAction: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  cartBarTotal: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 'auto',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    marginBottom: spacing.md,
    padding: spacing.sm,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  productImg: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    marginBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  productFav: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  productName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  productDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  productPrice: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  addBtnSm: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedFilesList: {
    marginTop: spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 0,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderRadius: 8,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  uploadedFileName: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  uploadedFileSize: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    gap: spacing.xs,
  },
  quantityBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  quantityAdjusterSm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  quantityBtnSm: {
    width: 18,
    height: 18,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
  },
  quantityTextSm: {
    minWidth: 18,
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  uploadedSection: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  uploadedFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addMoreText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceDark,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDark,
    gap: spacing.sm,
  },
  filePreviewWrap: {
    position: 'relative',
    width: 80,
    height: 60,
  },
  filePreviewImg: {
    width: 80,
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  filePreviewPlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.surfaceDark,
  },
  pageBadgeLoading: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.surfaceDark,
  },
  pageBadgeText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  filePagesText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
