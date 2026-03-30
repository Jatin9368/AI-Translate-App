import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Animated, Easing, StatusBar,
  ScrollView, TextInput, PermissionsAndroid, Platform
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { translateDirect } from '../../services/translate';
import LanguagePicker from '../../components/LanguagePicker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/config';
import { getLanguageName } from '../../constants/languages';

function toRecognitionLang(code) {
  const map = {
    'auto':'en-US','hi':'hi-IN','bn':'bn-IN','te':'te-IN','mr':'mr-IN',
    'ta':'ta-IN','gu':'gu-IN','kn':'kn-IN','ml':'ml-IN','pa':'pa-IN',
    'ur':'ur-PK','ne':'ne-NP','si':'si-LK','or':'or-IN','as':'as-IN',
    'en':'en-US','es':'es-ES','fr':'fr-FR','de':'de-DE','it':'it-IT',
    'pt':'pt-BR','ru':'ru-RU','zh-CN':'zh-CN','zh-TW':'zh-TW',
    'ja':'ja-JP','ko':'ko-KR','ar':'ar-SA','tr':'tr-TR','vi':'vi-VN',
    'th':'th-TH','id':'id-ID','ms':'ms-MY','nl':'nl-NL','pl':'pl-PL',
    'sv':'sv-SE','da':'da-DK','fi':'fi-FI','no':'nb-NO','cs':'cs-CZ',
    'uk':'uk-UA','el':'el-GR','he':'he-IL','fa':'fa-IR','sw':'sw-KE',
  };
  return map[code] || 'en-US';
}

export default function VoiceScreen() {
  const [isListening, setIsListening]       = useState(false);
  const [inputText, setInputText]           = useState('');
  const [partialText, setPartialText]       = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLang, setDetectedLang]     = useState('');
  const [sourceLang, setSourceLang]         = useState({ code: 'auto', name: 'Auto Detect' });
  const [targetLang, setTargetLang]         = useState({ code: 'en', name: 'English' });
  const [showSrcPicker, setShowSrcPicker]   = useState(false);
  const [showTgtPicker, setShowTgtPicker]   = useState(false);
  const [translating, setTranslating]       = useState(false);
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [copied, setCopied]                 = useState(false);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const pulseRef   = useRef(null);
  const recognizer = useRef(null);

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  // ── Translate helper (stored in ref so event callbacks can access it) ────
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

  const doTranslate = async (text) => {
    const t = text?.trim();
    if (!t) return;
    setTranslating(true);
    setTranslatedText('');
    try {
      const result = await translateDirect(t, sourceLangRef.current.code, targetLangRef.current.code);
      setTranslatedText(result.translatedText);
      if (sourceLangRef.current.code === 'auto' && result.detectedLang) {
        setDetectedLang(getLanguageName(result.detectedLang));
      }
    } catch (err) {
      Alert.alert('Translation Error', err.message);
    } finally {
      setTranslating(false);
    }
  };

  // ── Android SpeechRecognizer via NativeModules ───────────────────────────
  const requestMic = async () => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'AI Translate needs microphone for voice translation.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleMicPress = async () => {
    if (isListening) {
      stopRecognition();
      return;
    }

    const ok = await requestMic();
    if (!ok) {
      Alert.alert('Permission Denied', 'Enable microphone in:\nSettings → Apps → AI Translate → Permissions');
      return;
    }

    setInputText('');
    setPartialText('');
    setTranslatedText('');
    setDetectedLang('');
    startRecognition();
  };

  const startRecognition = () => {
    // Use Android's built-in SpeechRecognizer via Expo's Audio + Intent
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        // Try ExpoSpeechRecognition first
        if (NativeModules.ExpoSpeechRecognition) {
          NativeModules.ExpoSpeechRecognition.start(
            toRecognitionLang(sourceLangRef.current.code),
            true, // interim results
            (error) => {
              setIsListening(false); stopPulse(); setPartialText('');
              if (error) Alert.alert('Error', error);
            },
            (text, isFinal) => {
              if (isFinal) {
                setInputText(text); setPartialText('');
                setIsListening(false); stopPulse();
                doTranslate(text);
              } else {
                setPartialText(text);
              }
            }
          );
          setIsListening(true);
          startPulse();
          return;
        }
      } catch (_) {}
    }

    // Universal fallback — use Android Intent via Linking
    showManualFallback();
  };

  const stopRecognition = () => {
    try {
      const { NativeModules } = require('react-native');
      NativeModules.ExpoSpeechRecognition?.stop();
    } catch (_) {}
    setIsListening(false);
    stopPulse();
    setPartialText('');
  };

  const showManualFallback = () => {
    Alert.alert(
      '🎤 Voice Ready',
      'Type your text below and tap Translate.\n\nFor live mic support, rebuild with:\nnpx expo run:android',
      [{ text: 'OK' }]
    );
  };

  // ── Output actions ───────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!translatedText) return;
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    Speech.speak(translatedText, {
      language: targetLang.code,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    await Clipboard.setStringAsync(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (isListening) stopRecognition();
    setInputText(''); setPartialText('');
    setTranslatedText(''); setDetectedLang('');
    Speech.stop(); setIsSpeaking(false);
  };

  const QUICK_PHRASES = [
    'Hello, how are you?','Good morning','Thank you',
    'Where is the hospital?','What is your name?',
    'I need help','How much does it cost?',
  ];

  const displayText = partialText || inputText;

  return (
    <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={GRADIENTS.header} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Ionicons name="mic" size={24} color="#fff" />
        <Text style={styles.headerTitle}>Voice Translate</Text>
        {(inputText || translatedText) && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.langRow}>
        <TouchableOpacity style={styles.langBtn} onPress={() => setShowSrcPicker(true)}>
          <Text style={styles.langLabel}>FROM</Text>
          <Text style={styles.langName} numberOfLines={1}>
            {sourceLang.code === 'auto' ? '🌐 Auto' : sourceLang.name}
          </Text>
          <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.arrowBox}>
          <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
        </View>
        <TouchableOpacity style={styles.langBtn} onPress={() => setShowTgtPicker(true)}>
          <Text style={styles.langLabel}>TO</Text>
          <Text style={styles.langName} numberOfLines={1}>{targetLang.name}</Text>
          <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.micArea}>
          <Animated.View style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }] },
            isListening && styles.pulseRingActive,
          ]} />
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleMicPress}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isListening ? GRADIENTS.micActive : GRADIENTS.mic}
              style={styles.micGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name={isListening ? 'stop' : 'mic'} size={44} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.micStatus}>
          {isListening ? '🔴  Listening... speak now' : 'Tap mic to speak  •  or type below'}
        </Text>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>
              {detectedLang ? `Detected: ${detectedLang}` : 'Spoken / Typed Text'}
            </Text>
            {partialText ? <Text style={styles.liveTag}>● LIVE</Text> : null}
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Speak or type text here..."
            placeholderTextColor="#444"
            value={displayText}
            onChangeText={t => {
              setInputText(t);
              setPartialText('');
              if (!t) setTranslatedText('');
            }}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            autoCorrect={false}
            editable={!isListening}
          />
        </View>

        <TouchableOpacity
          style={[styles.translateBtn, (!inputText.trim() || translating) && styles.translateBtnOff]}
          onPress={() => doTranslate(inputText)}
          disabled={!inputText.trim() || translating}
          activeOpacity={0.8}
        >
          {translating
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="language" size={18} color="#fff" /><Text style={styles.translateBtnText}>Translate</Text></>
          }
        </TouchableOpacity>

        {(translatedText || translating) && (
          <View style={[styles.card, styles.outputCard]}>
            <View style={styles.cardTop}>
              <View style={styles.outputLangRow}>
                <View style={styles.dot} />
                <Text style={styles.cardLabel}>{targetLang.name}</Text>
              </View>
              {translatedText && (
                <View style={styles.outputBtns}>
                  <TouchableOpacity onPress={handleSpeak} style={styles.iconBtn}>
                    <Ionicons name={isSpeaking ? 'stop-circle' : 'volume-medium'} size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCopy} style={styles.iconBtn}>
                    <Ionicons name={copied ? 'checkmark-done' : 'copy-outline'} size={20} color={copied ? COLORS.success : COLORS.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {translating
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
              : <Text style={styles.translatedText} selectable>{translatedText}</Text>
            }
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Phrases</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 14, paddingRight: 6 }}>
          {QUICK_PHRASES.map(phrase => (
            <TouchableOpacity
              key={phrase}
              style={styles.phraseChip}
              onPress={() => { setInputText(phrase); doTranslate(phrase); }}
            >
              <Text style={styles.phraseText}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 30 }} />
      </ScrollView>

      <LanguagePicker visible={showSrcPicker} onSelect={setSourceLang} onClose={() => setShowSrcPicker(false)} showAuto />
      <LanguagePicker visible={showTgtPicker} onSelect={setTargetLang} onClose={() => setShowTgtPicker(false)} showAuto={false} />
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: 'transparent' },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 16 },
  headerTitle:     { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text },
  clearBtn:        { padding: 6 },
  langRow:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  langBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 2 },
  langLabel:       { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  langName:        { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: 110 },
  arrowBox:        { width: 36, alignItems: 'center' },
  micArea:         { alignItems: 'center', justifyContent: 'center', height: 150, marginVertical: 4 },
  pulseRing:       { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: `${COLORS.primary}22` },
  pulseRingActive: { backgroundColor: `${COLORS.error}28` },
  micBtn:          { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', elevation: 10, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  micBtnActive:    { shadowColor: COLORS.error },
  micGrad:         { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  micStatus:       { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginBottom: 14 },
  card:            { backgroundColor: COLORS.surface, marginHorizontal: 14, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  outputCard:      { borderColor: COLORS.primaryDark, backgroundColor: COLORS.outputBg },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardLabel:       { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  liveTag:         { fontSize: 11, color: COLORS.error, fontWeight: '700' },
  outputLangRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  outputBtns:      { flexDirection: 'row', gap: 4 },
  iconBtn:         { padding: 6 },
  textInput:       { fontSize: 18, color: COLORS.text, minHeight: 90, lineHeight: 26 },
  translatedText:  { fontSize: 20, color: COLORS.primary, lineHeight: 28, fontWeight: '500' },
  translateBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 14, borderRadius: 14, paddingVertical: 15, marginBottom: 10, backgroundColor: COLORS.primary, elevation: 6, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  translateBtnOff: { backgroundColor: COLORS.surface2, shadowOpacity: 0, elevation: 0 },
  translateBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle:    { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 14, marginBottom: 8, marginTop: 4 },
  phraseChip:      { backgroundColor: COLORS.surface2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  phraseText:      { color: COLORS.text, fontSize: 13 },
});
