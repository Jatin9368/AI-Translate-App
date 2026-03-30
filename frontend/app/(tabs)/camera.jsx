import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { translateText } from '../../services/api';
import LanguagePicker from '../../components/LanguagePicker';
import { COLORS } from '../../constants/config';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing]     = useState('back');
  const [flash, setFlash]       = useState('off');
  const [translating, setTranslating] = useState(false);
  const [capturedText, setCapturedText]   = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState({ code: 'en', name: 'English' });
  const [showPicker, setShowPicker] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.permIcon}>
          <Ionicons name="camera" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permText}>Allow camera to translate text in real-time.</Text>
        <TouchableOpacity style={styles.allowBtn} onPress={requestPermission}>
          <Text style={styles.allowBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert('Permission Denied', 'Enable camera in device settings to use this feature.')}>
          <Text style={styles.denyText}>Deny</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || translating) return;
    setTranslating(true);
    try {
      await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      Alert.alert(
        'Photo Captured',
        'OCR requires @react-native-ml-kit/text-recognition (native module).\n\nInstall it for full camera translation support.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
            <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.langPill} onPress={() => setShowPicker(true)}>
            <Text style={styles.langPillText}>→ {targetLang.name}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
            <Ionicons name="camera-reverse" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Viewfinder */}
        <View style={styles.vfContainer}>
          <View style={styles.vf}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
          </View>
          <Text style={styles.vfHint}>Point at text to translate</Text>
        </View>

        {/* Capture */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.captureBtn, translating && { opacity: 0.5 }]}
            onPress={handleCapture}
            disabled={translating}
          >
            {translating
              ? <ActivityIndicator color="#fff" size="large" />
              : <View style={styles.captureBtnInner} />
            }
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Result modal */}
      <Modal visible={showResult} transparent animationType="slide">
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Original</Text>
            <Text style={styles.resultOriginal}>{capturedText}</Text>
            <Text style={styles.resultLabel}>{targetLang.name}</Text>
            <Text style={styles.resultTranslated}>{translatedText}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowResult(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LanguagePicker visible={showPicker} onSelect={setTargetLang} onClose={() => setShowPicker(false)} showAuto={false} />
    </View>
  );
}

const C = 20; // corner size
const styles = StyleSheet.create({
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  camera:       { flex: 1 },
  permContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background, gap: 14 },
  permIcon:     { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  permTitle:    { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  permText:     { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  allowBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  allowBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  denyText:     { color: COLORS.textSecondary, fontSize: 15, paddingVertical: 8 },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: 'rgba(0,0,0,0.5)' },
  ctrlBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  langPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  langPillText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  vfContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vf:           { width: 260, height: 160, position: 'relative' },
  corner:       { position: 'absolute', width: C, height: C, borderColor: '#fff', borderWidth: 0 },
  cTL:          { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cTR:          { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cBL:          { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cBR:          { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  vfHint:       { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 14 },
  bottomBar:    { alignItems: 'center', paddingVertical: 36, backgroundColor: 'rgba(0,0,0,0.5)' },
  captureBtn:   { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  resultOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  resultCard:   { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  resultLabel:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  resultOriginal: { fontSize: 16, color: COLORS.text, marginBottom: 8 },
  resultTranslated: { fontSize: 22, color: COLORS.primary, fontWeight: '600', marginBottom: 8 },
  closeBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
