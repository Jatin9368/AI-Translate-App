import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Share, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { translateDirect, detectDirect } from '../../services/translate';
import LanguagePicker from '../../components/LanguagePicker';
import { getLanguageName } from '../../constants/languages';
import { COLORS } from '../../constants/config';

export default function TranslateScreen() {
  const [inputText, setInputText]       = useState('');
  const [outputText, setOutputText]     = useState('');
  const [sourceLang, setSourceLang]     = useState({ code: 'auto', name: 'Detect language' });
  const [targetLang, setTargetLang]     = useState({ code: 'en',   name: 'English' });
  const [loading, setLoading]           = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [showSrc, setShowSrc]           = useState(false);
  const [showTgt, setShowTgt]           = useState(false);
  const [speakingIn, setSpeakingIn]     = useState(false);
  const [speakingOut, setSpeakingOut]   = useState(false);
  const [copied, setCopied]             = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');
    try {
      const result = await translateDirect(inputText.trim(), sourceLang.code, targetLang.code);
      setOutputText(result.translatedText);
      if (sourceLang.code === 'auto' && result.detectedLang) {
        setDetectedLang(getLanguageName(result.detectedLang));
      }
    } catch (err) {
      // Show full error so we can debug
      Alert.alert(
        'Translation Failed',
        err.message,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [inputText, sourceLang, targetLang]);

  const handleSwap = () => {
    if (sourceLang.code === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
    setDetectedLang(null);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    await Clipboard.setStringAsync(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!outputText) return;
    Share.share({ message: `${inputText}\n\n${outputText}` });
  };

  const speakText = (text, lang, isSpeaking, setIsSpeaking) => {
    if (!text) return;
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    Speech.speak(text, {
      language: lang === 'auto' ? 'en' : lang,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const clearAll = () => {
    setInputText(''); setOutputText(''); setDetectedLang(null);
    Speech.stop(); setSpeakingIn(false); setSpeakingOut(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="language" size={26} color={COLORS.primary} />
        <Text style={styles.headerTitle}>AI Translate</Text>
      </View>

      {/* Language Bar */}
      <View style={styles.langBar}>
        <TouchableOpacity style={styles.langBtn} onPress={() => setShowSrc(true)}>
          <Text style={styles.langBtnText} numberOfLines={1}>
            {sourceLang.code === 'auto' ? '🌐 Detect' : sourceLang.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.swapBtn, sourceLang.code === 'auto' && { opacity: 0.25 }]}
          onPress={handleSwap}
          disabled={sourceLang.code === 'auto'}
        >
          <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.langBtn} onPress={() => setShowTgt(true)}>
          <Text style={styles.langBtnText} numberOfLines={1}>{targetLang.name}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Input Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLang}>
              {sourceLang.code === 'auto'
                ? (detectedLang ? `Detected: ${detectedLang}` : 'Detect language')
                : sourceLang.name}
            </Text>
            {inputText.length > 0 && (
              <TouchableOpacity onPress={clearAll}>
                <Ionicons name="close-circle" size={20} color="#555" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.inputField}
            placeholder="Enter text to translate..."
            placeholderTextColor="#444"
            value={inputText}
            onChangeText={t => {
              setInputText(t);
              if (!t) { setOutputText(''); setDetectedLang(null); }
            }}
            multiline
            maxLength={5000}
            textAlignVertical="top"
            autoCorrect={false}
          />

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => speakText(inputText, sourceLang.code, speakingIn, setSpeakingIn)}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name={speakingIn ? 'stop-circle' : 'volume-medium'}
                size={20}
                color={inputText.trim() ? COLORS.textSecondary : '#333'}
              />
            </TouchableOpacity>
            <Text style={styles.charCount}>{inputText.length}/5000</Text>
          </View>
        </View>

        {/* Translate Button */}
        <TouchableOpacity
          style={[styles.translateBtn, (!inputText.trim() || loading) && styles.translateBtnOff]}
          onPress={handleTranslate}
          disabled={!inputText.trim() || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="language" size={18} color="#fff" />
                <Text style={styles.translateBtnText}>Translate</Text>
              </>
          }
        </TouchableOpacity>

        {/* Output Card */}
        {(outputText || loading) && (
          <View style={[styles.card, styles.outputCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.outputLangRow}>
                <View style={styles.outputDot} />
                <Text style={styles.outputLangText}>{targetLang.name}</Text>
              </View>
            </View>

            {loading
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
              : <Text style={styles.outputField} selectable>{outputText}</Text>
            }

            {outputText && (
              <View style={styles.outputActions}>
                <TouchableOpacity
                  style={styles.outBtn}
                  onPress={() => speakText(outputText, targetLang.code, speakingOut, setSpeakingOut)}
                >
                  <Ionicons name={speakingOut ? 'stop-circle' : 'volume-medium'} size={19} color={COLORS.primary} />
                  <Text style={styles.outBtnText}>{speakingOut ? 'Stop' : 'Speak'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outBtn} onPress={handleCopy}>
                  <Ionicons name={copied ? 'checkmark-done' : 'copy-outline'} size={19} color={copied ? COLORS.success : COLORS.primary} />
                  <Text style={[styles.outBtnText, copied && { color: COLORS.success }]}>{copied ? 'Copied!' : 'Copy'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={19} color={COLORS.primary} />
                  <Text style={styles.outBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <LanguagePicker visible={showSrc} onSelect={setSourceLang} onClose={() => setShowSrc(false)} showAuto />
      <LanguagePicker visible={showTgt} onSelect={setTargetLang} onClose={() => setShowTgt(false)} showAuto={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },

  langBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, marginHorizontal: 14,
    borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 6, gap: 4,
  },
  langBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: 110 },
  swapBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  scroll: { flex: 1 },

  card: {
    backgroundColor: COLORS.surface, marginHorizontal: 14,
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  outputCard: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.outputBg,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  cardLang: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputField: {
    fontSize: 20, color: COLORS.text, minHeight: 110,
    lineHeight: 30, fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  iconAction: { padding: 4 },
  charCount:  { fontSize: 12, color: '#444' },

  translateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 14, borderRadius: 14, paddingVertical: 15,
    marginBottom: 10, backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  translateBtnOff: { backgroundColor: COLORS.surface2, shadowOpacity: 0, elevation: 0 },
  translateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  outputLangRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outputDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  outputLangText:{ fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  outputField:   { fontSize: 22, color: COLORS.primary, lineHeight: 32, fontWeight: '400' },

  outputActions: {
    flexDirection: 'row', gap: 6, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1a3a6e',
  },
  outBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface2, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  outBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
});
