import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/Toaster'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LoginPage } from '@/pages/auth/LoginPage'
import { OtpPage } from '@/pages/auth/OtpPage'
import { HomePage } from '@/pages/home/HomePage'
import { SellerDetailPage } from '@/pages/seller/SellerDetailPage'
import { ProductDetailPage } from '@/pages/seller/ProductDetailPage'
import { CartPage } from '@/pages/cart/CartPage'
import { PaymentSuccessPage } from '@/pages/payment/PaymentSuccessPage'
import { PaymentFailurePage } from '@/pages/payment/PaymentFailurePage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { OrderDetailPage } from '@/pages/orders/OrderDetailPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { EditProfilePage } from '@/pages/profile/EditProfilePage'
import { AddressesPage } from '@/pages/profile/AddressesPage'
import { FavoritesPage } from '@/pages/profile/FavoritesPage'
import { ProductBrowsePage } from '@/pages/browse/ProductBrowsePage'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Mobile-first: phone-width frame on desktop, full-bleed on mobile. */}
        <div className="relative mx-auto min-h-dvh w-full max-w-107.5 bg-bg shadow-xl">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-otp" element={<OtpPage />} />

            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/sellers/:id" element={<SellerDetailPage />} />
              <Route path="/sellers/:id/products/:productId" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/profile/addresses" element={<AddressesPage />} />
              <Route path="/profile/favorites" element={<FavoritesPage />} />
              <Route path="/browse" element={<ProductBrowsePage />} />
            </Route>

            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/failure" element={<PaymentFailurePage />} />
            <Route path="*" element={<Placeholder name="Not found" />} />
          </Routes>
          <Toaster />
          <InstallPrompt />
        </div>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
