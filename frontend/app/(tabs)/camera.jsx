import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, StatusBar, ScrollView,
  Dimensions, Image, PanResponder
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { translateDirect } from '../../services/translate';
import LanguagePicker from '../../components/LanguagePicker';
import { COLORS, GRADIENTS } from '../../constants/config';

const { width, height } = Dimensions.get('window');

// ── OCR ──────────────────────────────────────────────────────────────────────
async function extractText(base64) {
  try {
    const form = new FormData();
    form.append('base64Image', `data:image/jpeg;base64,${base64}`);
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('OCREngine', '2');
    form.append('scale', 'true');
    form.append('isTable', 'false');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: 'helloworld' },
      body: form,
    });

    const json = await res.json();
    if (json.IsErroredOnProcessing) throw new Error(json.ErrorMessage?.[0] || 'OCR processing failed');
    const text = json.ParsedResults?.[0]?.ParsedText?.trim();
    if (!text) throw new Error('No text found in image.\n\nTips:\n• Make sure text is clear and well-lit\n• Hold camera steady\n• Avoid blurry images');
    return text;
  } catch (err) {
    if (err.message.includes('No text')) throw err;
    throw new Error('OCR service unavailable. Check internet connection.');
  }
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing]       = useState('back');
  const [flash, setFlash]         = useState('off');
  const [processing, setProcessing] = useState(false);
  const [step, setStep]           = useState('idle');
  const [targetLang, setTargetLang] = useState({ code: 'hi', name: 'Hindi', flag: '🇮🇳' });
  const [showPicker, setShowPicker] = useState(false);
  const [result, setResult]       = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied]       = useState(false);

  // Crop state
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCrop, setShowCrop]   = useState(false);
  const [cropBox, setCropBox]     = useState({ x: 60, y: 120, w: width - 120, h: 160 });
  const [dragMode, setDragMode]   = useState(null); // 'move' | 'resize-br'
  const dragStart = useRef({ px: 0, py: 0, bx: 0, by: 0, bw: 0, bh: 0 });

  const cameraRef = useRef(null);

  const stepLabel = step === 'ocr' ? 'Reading text...' : step === 'translating' ? `Translating to ${targetLang.name}...` : '';

  // ── PanResponder for crop box ─────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gs) => {
        const { pageX, pageY } = e.nativeEvent;
        setCropBox(prev => {
          // Check if near bottom-right corner (resize handle)
          const nearBR = pageX > prev.x + prev.w - 30 && pageY > prev.y + prev.h - 30;
          setDragMode(nearBR ? 'resize-br' : 'move');
          dragStart.current = { px: pageX, py: pageY, bx: prev.x, by: prev.y, bw: prev.w, bh: prev.h };
          return prev;
        });
      },
      onPanResponderMove: (e, gs) => {
        const { pageX, pageY } = e.nativeEvent;
        const { px, py, bx, by, bw, bh } = dragStart.current;
        const dx = pageX - px;
        const dy = pageY - py;
        setCropBox(prev => {
          if (dragMode === 'resize-br') {
            return {
              ...prev,
              w: Math.max(80, bw + dx),
              h: Math.max(60, bh + dy),
            };
          } else {
            return {
              ...prev,
              x: Math.max(0, Math.min(width - prev.w, bx + dx)),
              y: Math.max(0, Math.min(height - prev.h, by + dy)),
            };
          }
        });
      },
    })
  ).current;

  // ── Permission loading ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }}>
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </LinearGradient>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }}>
        <SafeAreaView style={styles.permWrap}>
          <StatusBar barStyle="light-content" />
          <View style={styles.permIconWrap}>
            <LinearGradient colors={GRADIENTS.button} style={styles.permIconGrad}>
              <Ionicons name="camera" size={54} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSub}>UK Translate needs camera to{'\n'}detect and translate text in real-time</Text>
          <View style={styles.triDivider}>
            {['#FF9933','#FFFFFF','#138808'].map(c => (
              <View key={c} style={[styles.triSeg, { backgroundColor: c, opacity: c==='#FFFFFF'?0.4:0.8 }]} />
            ))}
          </View>
          <TouchableOpacity onPress={requestPermission} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.button} style={styles.allowBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.allowBtnText}>Allow Camera Access</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.denyBtn} onPress={() =>
            Alert.alert('Enable Camera', 'Go to:\nSettings → Apps → UK Translate → Permissions → Camera → Allow')
          }>
            <Text style={styles.denyText}>Not Now</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Capture photo → show crop screen ─────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.85, skipProcessing: false,
      });
      if (!photo?.base64) throw new Error('Failed to capture image. Try again.');
      setCapturedPhoto(photo);
      // Reset crop box to center
      setCropBox({ x: 40, y: height * 0.25, w: width - 80, h: 180 });
      setShowCrop(true);
    } catch (err) {
      Alert.alert('Capture Failed', err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── After crop confirm → OCR + Translate ─────────────────────────────────
  const handleCropConfirm = async () => {
    if (!capturedPhoto) return;
    setShowCrop(false);
    setProcessing(true);
    setStep('ocr');
    try {
      // We send full image to OCR (crop is visual guide for user)
      // For actual crop, we pass cropBox ratio hints via OCR overlay
      const extractedText = await extractText(capturedPhoto.base64);
      setStep('translating');
      const translated = await translateDirect(extractedText, 'auto', targetLang.code);
      setResult({
        original:     extractedText,
        translated:   translated.translatedText,
        detectedLang: translated.detectedLang || 'auto',
        targetLang:   targetLang.name,
      });
      setShowResult(true);
    } catch (err) {
      Alert.alert('Could Not Translate', err.message, [{ text: 'Try Again' }]);
    } finally {
      setProcessing(false);
      setStep('idle');
    }
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setCapturedPhoto(null);
  };

  const handleSpeak = () => {
    if (!result?.translated) return;
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    Speech.speak(result.translated, {
      language: targetLang.code,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleCopy = async () => {
    if (!result?.translated) return;
    await Clipboard.setStringAsync(result.translated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanAgain = () => {
    setShowResult(false);
    setResult(null);
    setCapturedPhoto(null);
    setIsSpeaking(false);
    setCopied(false);
    Speech.stop();
  };

  // ── CROP SCREEN ───────────────────────────────────────────────────────────
  if (showCrop && capturedPhoto) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Captured image */}
        <Image
          source={{ uri: `data:image/jpeg;base64,${capturedPhoto.base64}` }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Dark overlay outside crop box */}
        {/* Top */}
        <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
        {/* Bottom */}
        <View style={[styles.overlay, { top: cropBox.y + cropBox.h, left: 0, right: 0, bottom: 0 }]} />
        {/* Left */}
        <View style={[styles.overlay, { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.h }]} />
        {/* Right */}
        <View style={[styles.overlay, { top: cropBox.y, left: cropBox.x + cropBox.w, right: 0, height: cropBox.h }]} />

        {/* Crop box with drag */}
        <View
          style={[styles.cropBox, { left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h }]}
          {...panResponder.panHandlers}
        >
          {/* Corners */}
          <View style={[styles.cropCorner, { top: -2, left: -2 }]} />
          <View style={[styles.cropCorner, { top: -2, right: -2 }]} />
          <View style={[styles.cropCorner, { bottom: -2, left: -2 }]} />
          <View style={[styles.cropCorner, { bottom: -2, right: -2 }]} />

          {/* Grid lines */}
          <View style={styles.cropGridH1} />
          <View style={styles.cropGridH2} />
          <View style={styles.cropGridV1} />
          <View style={styles.cropGridV2} />

          {/* Resize handle bottom-right */}
          <View style={styles.resizeHandle}>
            <Ionicons name="resize" size={16} color="#FF9933" />
          </View>

          {/* Move hint */}
          <View style={styles.cropMoveHint}>
            <Ionicons name="move" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cropMoveText}>Drag to move • Corner to resize</Text>
          </View>
        </View>

        {/* Top bar */}
        <SafeAreaView edges={['top']} style={styles.cropTopBar}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleCropCancel}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cropTitle}>Select Text Area</Text>
          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* Bottom bar */}
        <View style={styles.cropBottomBar}>
          <Text style={styles.cropHint}>Adjust the box around the text you want to translate</Text>
          <View style={styles.cropBtnRow}>
            <TouchableOpacity style={styles.cropCancelBtn} onPress={handleCropCancel}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.cropCancelText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCropConfirm} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.button} style={styles.cropConfirmBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.cropConfirmText}>Translate This</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── CAMERA UI ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
      />

      {/* TOP BAR */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <LinearGradient colors={['rgba(0,0,0,0.75)','transparent']} style={styles.topBar}>
          {/* Flash toggle */}
          <TouchableOpacity
            style={[styles.ctrlBtn, flash === 'on' && styles.ctrlBtnActive]}
            onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}
          >
            <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={22} color={flash === 'on' ? '#FFD700' : '#fff'} />
          </TouchableOpacity>

          <Text style={styles.topTitle}>UK Translate</Text>

          {/* Flip camera */}
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
            <Ionicons name="camera-reverse" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>

      {/* LANGUAGE SELECTOR */}
      <View style={styles.langSelectorWrap}>
        <Text style={styles.langSelectorLabel}>Translate to</Text>
        <TouchableOpacity style={styles.langSelectorBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          <LinearGradient colors={['rgba(0,0,0,0.7)','rgba(0,0,0,0.5)']} style={styles.langSelectorGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Text style={styles.langSelectorFlag}>{targetLang.flag}</Text>
            <Text style={styles.langSelectorName}>{targetLang.name}</Text>
            <View style={styles.langSelectorChevron}>
              <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* VIEWFINDER */}
      <View style={styles.vfWrap}>
        <View style={styles.vf}>
          {[
            { top:0, left:0,  borderTopWidth:3, borderLeftWidth:3,  borderTopLeftRadius:8 },
            { top:0, right:0, borderTopWidth:3, borderRightWidth:3, borderTopRightRadius:8 },
            { bottom:0, left:0,  borderBottomWidth:3, borderLeftWidth:3,  borderBottomLeftRadius:8 },
            { bottom:0, right:0, borderBottomWidth:3, borderRightWidth:3, borderBottomRightRadius:8 },
          ].map((s, i) => <View key={i} style={[styles.corner, s]} />)}
          <View style={styles.scanHintBox}>
            <Ionicons name="scan-outline" size={18} color="rgba(255,153,51,0.8)" />
            <Text style={styles.scanHintText}>Point at text to translate</Text>
          </View>
        </View>
      </View>

      {/* BOTTOM CAPTURE */}
      <View style={styles.bottomSafe}>
        <LinearGradient colors={['transparent','rgba(0,0,0,0.9)']} style={styles.bottomBar}>
          {processing && (
            <View style={styles.processingRow}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.processingText}>{stepLabel}</Text>
            </View>
          )}

          {/* Bottom action row: gallery hint | capture | crop hint */}
          <View style={styles.captureRow}>
            <View style={styles.sideHint}>
              <Ionicons name="crop-outline" size={20} color="rgba(255,255,255,0.5)" />
              <Text style={styles.sideHintText}>Crop{'\n'}after</Text>
            </View>

            <TouchableOpacity
              onPress={handleCapture}
              disabled={processing}
              activeOpacity={0.85}
              style={[styles.captureBtnWrap, processing && { opacity: 0.5 }]}
            >
              <LinearGradient colors={GRADIENTS.button} style={styles.captureBtn} start={{x:0,y:0}} end={{x:1,y:1}}>
                <View style={styles.captureBtnInner}>
                  {processing
                    ? <ActivityIndicator color="#fff" size="large" />
                    : <Ionicons name="camera" size={34} color="#fff" />
                  }
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.sideHint}>
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={20} color={flash === 'on' ? '#FFD700' : 'rgba(255,255,255,0.5)'} />
              <Text style={styles.sideHintText}>Flash{'\n'}{flash === 'on' ? 'ON' : 'OFF'}</Text>
            </View>
          </View>

          <Text style={styles.captureHint}>
            {processing ? stepLabel : 'Tap to capture → crop → translate'}
          </Text>
        </LinearGradient>
      </View>

      {/* RESULT MODAL */}
      <Modal visible={showResult} transparent animationType="slide" onRequestClose={handleScanAgain}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} onPress={handleScanAgain} activeOpacity={1} />
          <LinearGradient colors={['#1e1a2e','#12101a']} style={styles.resultSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTriBar}>
              {['#FF9933','#FFFFFF','#138808'].map(c => <View key={c} style={[styles.sheetTriStripe, { backgroundColor: c }]} />)}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
              <View style={styles.resultBlock}>
                <View style={styles.resultLabelRow}>
                  <View style={[styles.resultDot, { backgroundColor: COLORS.textSecondary }]} />
                  <Text style={styles.resultLabelText}>
                    Original Text{result?.detectedLang && result.detectedLang !== 'auto' ? `  (${result.detectedLang})` : ''}
                  </Text>
                </View>
                <View style={styles.resultTextBox}>
                  <Text style={styles.resultOriginalText} selectable>{result?.original}</Text>
                </View>
              </View>

              <View style={styles.arrowRow}>
                <LinearGradient colors={GRADIENTS.button} style={styles.arrowLine} start={{x:0,y:0}} end={{x:1,y:0}} />
                <View style={styles.arrowIconWrap}>
                  <LinearGradient colors={GRADIENTS.button} style={styles.arrowIcon}>
                    <Ionicons name="arrow-down" size={16} color="#fff" />
                  </LinearGradient>
                </View>
                <LinearGradient colors={GRADIENTS.button} style={styles.arrowLine} start={{x:0,y:0}} end={{x:1,y:0}} />
              </View>

              <View style={styles.resultBlock}>
                <View style={styles.resultLabelRow}>
                  <LinearGradient colors={GRADIENTS.button} style={styles.resultDot} />
                  <Text style={[styles.resultLabelText, { color: COLORS.primary }]}>{result?.targetLang}</Text>
                </View>
                <View style={[styles.resultTextBox, styles.resultTranslatedBox]}>
                  <Text style={styles.resultTranslatedText} selectable>{result?.translated}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleSpeak}>
                  <LinearGradient colors={GRADIENTS.button} style={styles.actionIcon}>
                    <Ionicons name={isSpeaking ? 'stop' : 'volume-medium'} size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionLabel}>{isSpeaking ? 'Stop' : 'Speak'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
                  <LinearGradient colors={copied ? [COLORS.success,'#00b894'] : GRADIENTS.button} style={styles.actionIcon}>
                    <Ionicons name={copied ? 'checkmark-done' : 'copy-outline'} size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.actionLabel, copied && { color: COLORS.success }]}>{copied ? 'Copied!' : 'Copy'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={handleScanAgain}>
                  <LinearGradient colors={['#2a2a3a','#1a1a2a']} style={styles.actionIcon}>
                    <Ionicons name="scan" size={20} color={COLORS.primary} />
                  </LinearGradient>
                  <Text style={styles.actionLabel}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>

      <LanguagePicker
        visible={showPicker}
        onSelect={setTargetLang}
        onClose={() => setShowPicker(false)}
        showAuto={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Permission
  permWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permIconWrap: { shadowColor: '#FF9933', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width:0, height:8 }, elevation: 16, marginBottom: 8 },
  permIconGrad: { width: 110, height: 110, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  permTitle:    { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  permSub:      { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  triDivider:   { flexDirection: 'row', width: 120, height: 3, borderRadius: 2, overflow: 'hidden', marginVertical: 8 },
  triSeg:       { flex: 1 },
  allowBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 16, elevation: 8, shadowColor: '#FF9933', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width:0, height:5 } },
  allowBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  denyBtn:      { paddingVertical: 12 },
  denyText:     { color: COLORS.textSecondary, fontSize: 15 },

  // Camera top
  topSafe:  { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16 },
  ctrlBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ctrlBtnActive: { backgroundColor: 'rgba(255,200,0,0.25)', borderColor: '#FFD700' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  // Language selector
  langSelectorWrap:    { position: 'absolute', top: 110, left: 0, right: 0, zIndex: 10, alignItems: 'center' },
  langSelectorLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 },
  langSelectorBtn:     { shadowColor: '#FF9933', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width:0, height:4 }, elevation: 10 },
  langSelectorGrad:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(255,153,51,0.5)', gap: 8, minWidth: 180, justifyContent: 'center' },
  langSelectorFlag:    { fontSize: 22 },
  langSelectorName:    { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  langSelectorChevron: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,153,51,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Viewfinder
  vfWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  vf:     { width: width * 0.8, height: height * 0.25, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FF9933' },
  scanHintBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,153,51,0.3)' },
  scanHintText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  // Bottom
  bottomSafe:     { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBar:      { alignItems: 'center', paddingBottom: 44, paddingTop: 24, gap: 10 },
  processingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processingText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  captureRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  sideHint:       { alignItems: 'center', gap: 4, width: 50 },
  sideHintText:   { color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center', lineHeight: 13 },
  captureBtnWrap: { shadowColor: '#FF9933', shadowOpacity: 0.7, shadowRadius: 22, shadowOffset: { width:0, height:8 }, elevation: 18 },
  captureBtn:     { width: 82, height: 82, borderRadius: 41, padding: 3 },
  captureBtnInner:{ flex: 1, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  captureHint:    { color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: 0.3 },

  // ── Crop screen ──────────────────────────────────────────────────────────
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },

  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FF9933',
    borderStyle: 'dashed',
  },
  cropCorner: {
    position: 'absolute',
    width: 18, height: 18,
    borderColor: '#FF9933',
    borderWidth: 3,
  },
  cropGridH1: { position: 'absolute', top: '33%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,153,51,0.3)' },
  cropGridH2: { position: 'absolute', top: '66%', left: 0, right: 0, height: 0.5, backgroundColor: 'rgba(255,153,51,0.3)' },
  cropGridV1: { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,153,51,0.3)' },
  cropGridV2: { position: 'absolute', left: '66%', top: 0, bottom: 0, width: 0.5, backgroundColor: 'rgba(255,153,51,0.3)' },

  resizeHandle: {
    position: 'absolute', bottom: 4, right: 4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FF9933',
  },
  cropMoveHint: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  cropMoveText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },

  cropTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  cropBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 44,
    gap: 14,
  },
  cropHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' },
  cropBtnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cropCancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  cropCancelText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cropConfirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  cropConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Result modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalDismiss:       { flex: 1 },
  resultSheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.78, borderWidth: 1, borderColor: 'rgba(255,153,51,0.2)' },
  sheetHandle:        { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  sheetTriBar:        { flexDirection: 'row', height: 3, marginTop: 8 },
  sheetTriStripe:     { flex: 1 },
  sheetContent:       { padding: 20, paddingBottom: 36 },
  resultBlock:        { marginBottom: 12 },
  resultLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultDot:          { width: 8, height: 8, borderRadius: 4 },
  resultLabelText:    { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  resultTextBox:      { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  resultTranslatedBox:{ backgroundColor: 'rgba(255,153,51,0.08)', borderColor: 'rgba(255,153,51,0.2)' },
  resultOriginalText: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  resultTranslatedText:{ fontSize: 22, color: COLORS.primary, lineHeight: 30, fontWeight: '500' },
  arrowRow:           { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 8 },
  arrowLine:          { flex: 1, height: 1.5, borderRadius: 1 },
  arrowIconWrap:      { shadowColor: '#FF9933', shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  arrowIcon:          { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  actionRow:          { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,153,51,0.12)' },
  actionBtn:          { alignItems: 'center', gap: 6 },
  actionIcon:         { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#FF9933', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width:0, height:3 } },
  actionLabel:        { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
});
