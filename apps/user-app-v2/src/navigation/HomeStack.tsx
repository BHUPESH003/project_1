import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { SearchScreen } from '@/screens/home/SearchScreen';
import { SellerDetailScreen } from '@/screens/home/SellerDetailScreen';
import { CartScreen } from '@/screens/cart/CartScreen';
import { PrintingConfigScreen } from '@/screens/cart/PrintingConfigScreen';
import { CheckoutScreen } from '@/screens/checkout/CheckoutScreen';
import { PaymentSuccessScreen } from '@/screens/checkout/PaymentSuccessScreen';
import { PaymentFailureScreen } from '@/screens/checkout/PaymentFailureScreen';

export type HomeStackParamList = {
  Home: undefined;
  Search: undefined;
  SellerDetail: { sellerId: string; sellerName?: string };
  Cart: undefined;
  PrintingConfig: {
    productId: string;
    sellerId: string;
    sellerName: string;
    productName: string;
    price: number;
  };
  Checkout: undefined;
  PaymentSuccess: { orderIds: string[] };
  PaymentFailure: { orderId?: string; errorMessage?: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="SellerDetail" component={SellerDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen
        name="PrintingConfig"
        component={PrintingConfigScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen
        name="PaymentFailure"
        component={PaymentFailureScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
