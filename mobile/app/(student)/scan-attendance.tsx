/**
 * Student QR Attendance Scanner Screen (Route: /(student)/scan-attendance)
 * Allows students to scan lecturer's dynamic QR code for attendance check-in.
 * Fallback to manual TOTP token entry when camera is unavailable.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StudentGuard } from '@/guards';
import { StudentQrScannerModal } from '@/features/student';

export default function ScanAttendanceScreen() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(student)/dashboard');
    }
  };

  return (
    <StudentGuard>
      <View style={styles.container} testID="student-scan-attendance-screen">
        <StudentQrScannerModal
          visible={isOpen}
          onClose={handleClose}
          onSuccess={() => {
            // Wait briefly so student can see success receipt, then navigate
          }}
          testID="student-scan-attendance-modal"
        />
      </View>
    </StudentGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
