import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import { OrderDetailScreen } from '@/screens/orders/OrderDetailScreen';

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
