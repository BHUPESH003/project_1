import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import useAuth from '@/hooks/useAuth';

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const { verifyOtp, isLoading, error } = useAuth();
  const router = useRouter();

  const handleVerify = async () => {
    try {
      await verifyOtp(phone, otp);
      // On success, navigate to main tabs
      router.replace('/(tabs)/home');
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Verify OTP' }} />
      <Text>Enter OTP sent to your phone</Text>
      <TextInput
        style={styles.input}
        placeholder="OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Verify" onPress={handleVerify} isLoading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginVertical: 12 },
  error: { color: 'red', marginBottom: 8 },
});
