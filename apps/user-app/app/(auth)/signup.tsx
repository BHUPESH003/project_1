import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="arrow-back" size={32} color="#A259FF" />
      </TouchableOpacity>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg} />
        <View style={styles.progressBarFg} />
      </View>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join your local community and start booking services today.</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={24} color="#A259FF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          placeholderTextColor="#A1A1A1"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>
      <Text style={styles.label}>Email Address <Text style={styles.optional}>(OPTIONAL)</Text></Text>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={24} color="#A259FF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="example@mail.com"
          placeholderTextColor="#A1A1A1"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>
      <Text style={styles.label}>Phone Number</Text>
      <View style={styles.inputContainer}>
        <Image source={{ uri: 'https://flagcdn.com/w40/us.png' }} style={styles.flagIcon} />
        <Text style={styles.countryCode}>+1</Text>
        <TextInput
          style={styles.input}
          placeholder="(555) 000-0000"
          placeholderTextColor="#A1A1A1"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.termsRow}>
        <TouchableOpacity onPress={() => setAgree(!agree)} style={styles.checkbox}>
          {agree && <View style={styles.checked} />}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          By signing up, you agree to our <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
      <TouchableOpacity style={styles.signupButton}>
        <Text style={styles.signupButtonText}>Sign Up</Text>
      </TouchableOpacity>
      <Text style={styles.orText}>OR CONNECT WITH</Text>
      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButton}>
          <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} style={styles.socialIcon} />
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-apple" size={24} color="#fff" style={styles.socialIcon} />
          <Text style={styles.socialText}>Apple</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.loginText}>
        Already have an account? <Text style={styles.loginLink}>Login</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18102B',
    padding: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    zIndex: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 24,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#2D2343',
    borderRadius: 3,
  },
  progressBarFg: {
    position: 'absolute',
    left: 0,
    width: '40%',
    height: 6,
    backgroundColor: '#A259FF',
    borderRadius: 3,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A1A1A1',
    fontSize: 18,
    marginBottom: 32,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  optional: {
    color: '#A1A1A1',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#231A3A',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 8,
  },
  flagIcon: {
    width: 24,
    height: 16,
    marginRight: 8,
    borderRadius: 3,
  },
  countryCode: {
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#A259FF',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    width: 12,
    height: 12,
    backgroundColor: '#A259FF',
    borderRadius: 2,
  },
  termsText: {
    color: '#A1A1A1',
    fontSize: 14,
    flex: 1,
    flexWrap: 'wrap',
  },
  link: {
    color: '#A259FF',
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: '#A259FF',
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  orText: {
    color: '#A1A1A1',
    textAlign: 'center',
    marginVertical: 12,
    letterSpacing: 2,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#231A3A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginHorizontal: 4,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  socialText: {
    color: '#fff',
    fontSize: 16,
  },
  loginText: {
    color: '#A1A1A1',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  loginLink: {
    color: '#A259FF',
    fontWeight: 'bold',
  },
});
