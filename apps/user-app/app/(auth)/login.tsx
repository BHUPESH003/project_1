import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Button } from '@/components/Button';
import useAuth from '@/hooks/useAuth';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    // No business logic here; just delegate to store
    try {
      await login(phone);
      // Backend sends OTP; navigation handled by router or effect elsewhere
    } catch (e) {
      // Error handled in store
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Login' }} />
      <Text>Enter phone number</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Send OTP" onPress={handleLogin} isLoading={isLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginVertical: 12 },
  error: { color: 'red', marginBottom: 8 },
});
