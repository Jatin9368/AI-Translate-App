import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Share, StatusBar, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { translateDirect } from '../../services/translate';
import LanguagePicker from '../../components/LanguagePicker';
import { getLanguageName } from '../../constants/languages';
import { COLORS, GRADIENTS } from '../../constants/config';

const { width } = Dimensions.get('window');

// ── Ashoka Chakra (24 spokes) ─────────────────────────────────────────────────
function AshokaChakra({ size = 52 }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer ring */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: 2.5,
        borderColor: 'rgba(0,0,160,0.9)',
      }} />
      {/* Inner ring */}
      <View style={{
        position: 'absolute', width: size * 0.72, height: size * 0.72,
        borderRadius: size * 0.36, borderWidth: 1,
        borderColor: 'rgba(0,0,160,0.5)',
      }} />
      {/* 24 spokes */}
      {spokes.map(i => (
        <View key={i} style={{
          position: 'absolute',
          width: 1.5,
          height: size * 0.36,
          backgroundColor: 'rgba(0,0,160,0.85)',
          bottom: size / 2,
          left: size / 2 - 0.75,
          transform: [
            { rotate: `${i * 15}deg` },
            { translateY: size * 0.18 },
          ],
        }} />
      ))}
      {/* Center dot */}
      <View style={{
        width: size * 0.13, height: size * 0.13,
        borderRadius: size * 0.065,
        backgroundColor: 'rgba(0,0,160,0.9)',
      }} />
    </View>
  );
}

// ── 3D Card ───────────────────────────────────────────────────────────────────
function Card3D({ children, style, colors = GRADIENTS.card }) {
  return (
    <View style={[s3d.shadow, style]}>
      <LinearGradient colors={colors} style={s3d.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={s3d.topShine} />
        {children}
      </LinearGradient>
    </View>
  );
}

const s3d = StyleSheet.create({
  shadow: {
    shadowColor: '#FF9933', shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,153,51,0.25)',
  },
  topShine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1.5, backgroundColor: 'rgba(255,255,255,0.22)',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
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
    setLoading(true); setOutputText('');
    try {
      const result = await translateDirect(inputText.trim(), sourceLang.code, targetLang.code);
      setOutputText(result.translatedText);
      if (sourceLang.code === 'auto' && result.detectedLang)
        setDetectedLang(getLanguageName(result.detectedLang));
    } catch (err) {
      Alert.alert('Translation Failed', err.message);
    } finally { setLoading(false); }
  }, [inputText, sourceLang, targetLang]);

  const handleSwap = () => {
    if (sourceLang.code === 'auto') return;
    setSourceLang(targetLang); setTargetLang(sourceLang);
    setInputText(outputText); setOutputText(inputText);
    setDetectedLang(null);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    await Clipboard.setStringAsync(outputText);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const speakText = (text, lang, isSpeaking, setIs) => {
    if (!text) return;
    if (isSpeaking) { Speech.stop(); setIs(false); return; }
    setIs(true);
    Speech.speak(text, {
      language: lang === 'auto' ? 'en' : lang,
      onDone: () => setIs(false), onError: () => setIs(false),
    });
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── HEADER ── */}
        <LinearGradient colors={GRADIENTS.header} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {/* India tricolor top stripe */}
          <View style={styles.triBar}>
            {['#FF9933', '#FFFFFF', '#138808'].map(c => (
              <View key={c} style={[styles.triStripe, { backgroundColor: c }]} />
            ))}
          </View>

          <View style={styles.headerRow}>
            {/* Left: Premium UK Logo */}
            <View style={styles.logoShadow}>
              <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f3460']}
                style={styles.logoBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {/* Tricolor accent bar on top */}
                <View style={styles.logoTriBar}>
                  {['#FF9933', '#FFFFFF', '#138808'].map(c => (
                    <View key={c} style={[styles.logoTriStripe, { backgroundColor: c }]} />
                  ))}
                </View>
                {/* UK text */}
                <Text style={styles.logoUK}>UK</Text>
                {/* Bottom glow line */}
                <LinearGradient
                  colors={['#FF9933', '#FF6200']}
                  style={styles.logoBottomLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </LinearGradient>
            </View>

            {/* Center: App name */}
            <View style={styles.headerCenter}>
              <Text style={styles.appName}>UK Translate</Text>
              <Text style={styles.appTagline}>भारत की आवाज़  •  Voice of India</Text>
            </View>

            {/* Right: Premium Translation Icon Badge */}
            <View style={styles.chakraBadge}>
              <LinearGradient
                colors={['#1a1a2e', '#0f3460']}
                style={styles.rightBadgeGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {/* Outer ring */}
                <View style={styles.rbRing} />
                {/* Language symbol */}
                <Text style={styles.rbIcon}>A</Text>
                {/* Small accent dot bottom right */}
                <LinearGradient
                  colors={['#FF9933', '#138808']}
                  style={styles.rbDot}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>

        {/* ── LANGUAGE BAR ── */}
        <View style={styles.langBarWrap}>
          <Card3D>
            <View style={styles.langBar}>
              <TouchableOpacity style={styles.langBtn} onPress={() => setShowSrc(true)}>
                <Text style={styles.langBtnLabel}>FROM</Text>
                <Text style={styles.langBtnText} numberOfLines={1}>
                  {sourceLang.code === 'auto' ? '🌐 Auto' : sourceLang.name}
                </Text>
                <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSwap}
                disabled={sourceLang.code === 'auto'}
                style={[{ opacity: sourceLang.code === 'auto' ? 0.3 : 1 }]}
              >
                <LinearGradient colors={GRADIENTS.button} style={styles.swapBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="swap-horizontal" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.langBtn} onPress={() => setShowTgt(true)}>
                <Text style={styles.langBtnLabel}>TO</Text>
                <Text style={styles.langBtnText} numberOfLines={1}>{targetLang.name}</Text>
                <Ionicons name="chevron-down" size={13} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </Card3D>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── INPUT CARD ── */}
          <View style={styles.cardWrap}>
            <Card3D>
              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLangRow}>
                    <LinearGradient colors={GRADIENTS.button} style={styles.cardDot} />
                    <Text style={styles.cardLang}>
                      {sourceLang.code === 'auto'
                        ? (detectedLang ? `Detected: ${detectedLang}` : 'Auto Detect')
                        : sourceLang.name}
                    </Text>
                  </View>
                  {inputText.length > 0 && (
                    <TouchableOpacity onPress={() => { setInputText(''); setOutputText(''); setDetectedLang(null); }}>
                      <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.inputField}
                  placeholder="यहाँ टाइप करें... / Type here..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={inputText}
                  onChangeText={t => { setInputText(t); if (!t) { setOutputText(''); setDetectedLang(null); } }}
                  multiline maxLength={5000} textAlignVertical="top" autoCorrect={false}
                />

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => speakText(inputText, sourceLang.code, speakingIn, setSpeakingIn)}
                    disabled={!inputText.trim()}
                  >
                    <Ionicons name={speakingIn ? 'stop-circle' : 'volume-medium'} size={20} color={inputText.trim() ? COLORS.primary : '#333'} />
                  </TouchableOpacity>
                  <Text style={styles.charCount}>{inputText.length}/5000</Text>
                </View>
              </View>
            </Card3D>
          </View>

          {/* ── TRANSLATE BUTTON ── */}
          <View style={styles.cardWrap}>
            <TouchableOpacity onPress={handleTranslate} disabled={!inputText.trim() || loading} activeOpacity={0.85}>
              <View style={styles.btnShadow}>
                <LinearGradient
                  colors={!inputText.trim() || loading ? ['#2a2a2a', '#1a1a1a'] : GRADIENTS.button}
                  style={styles.translateBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <View style={styles.btnShine} />
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="language" size={22} color="#fff" />
                        <Text style={styles.translateBtnText}>Translate  •  अनुवाद करें</Text>
                      </>
                  }
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── OUTPUT CARD ── */}
          {(outputText || loading) && (
            <View style={styles.cardWrap}>
              <Card3D colors={GRADIENTS.output}>
                <View style={styles.cardInner}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLangRow}>
                      <LinearGradient colors={GRADIENTS.buttonGreen} style={styles.cardDot} />
                      <Text style={[styles.cardLang, { color: COLORS.secondary }]}>{targetLang.name}</Text>
                    </View>
                  </View>

                  {loading
                    ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
                    : <Text style={styles.outputField} selectable>{outputText}</Text>
                  }

                  {outputText && (
                    <View style={styles.outputActions}>
                      {[
                        { icon: speakingOut ? 'stop-circle' : 'volume-medium', label: speakingOut ? 'Stop' : 'Speak', onPress: () => speakText(outputText, targetLang.code, speakingOut, setSpeakingOut) },
                        { icon: copied ? 'checkmark-done' : 'copy-outline', label: copied ? 'Copied!' : 'Copy', onPress: handleCopy, ok: copied },
                        { icon: 'share-social-outline', label: 'Share', onPress: () => Share.share({ message: outputText }) },
                      ].map(({ icon, label, onPress, ok }) => (
                        <TouchableOpacity key={label} style={styles.outBtn} onPress={onPress}>
                          <LinearGradient
                            colors={ok ? [COLORS.success, '#00b894'] : GRADIENTS.button}
                            style={styles.outBtnIcon}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name={icon} size={15} color="#fff" />
                          </LinearGradient>
                          <Text style={[styles.outBtnText, ok && { color: COLORS.success }]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </Card3D>
            </View>
          )}

          {/* ── INDIA FOOTER ── */}
          <View style={styles.indiaFooter}>
            <View style={styles.triLineFull}>
              {['#FF9933', '#FFFFFF', '#138808'].map(c => (
                <View key={c} style={[styles.triLineSegment, { backgroundColor: c, opacity: c === '#FFFFFF' ? 0.25 : 0.6 }]} />
              ))}
            </View>
            <Text style={styles.jaiHind}>🇮🇳  Jai Hind  •  जय हिन्द  🇮🇳</Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        <LanguagePicker visible={showSrc} onSelect={setSourceLang} onClose={() => setShowSrc(false)} showAuto />
        <LanguagePicker visible={showTgt} onSelect={setTargetLang} onClose={() => setShowTgt(false)} showAuto={false} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header:          { paddingBottom: 14, elevation: 10, shadowColor: '#FF9933', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  triBar:          { flexDirection: 'row', height: 5 },
  triStripe:       { flex: 1 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, gap: 10 },

  logoShadow:      { shadowColor: '#FF9933', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  logoBox:         { width: 54, height: 54, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,153,51,0.5)', alignItems: 'center', justifyContent: 'center' },
  logoTriBar:      { position: 'absolute', top: 0, left: 0, right: 0, height: 4, flexDirection: 'row' },
  logoTriStripe:   { flex: 1 },
  logoUK:          { fontSize: 22, fontWeight: '900', color: '#FF9933', letterSpacing: 1, textShadowColor: 'rgba(255,153,51,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  logoBottomLine:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },

  headerCenter:    { flex: 1 },
  appName:         { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: 0.4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  appTagline:      { fontSize: 9.5, color: 'rgba(255,255,255,0.88)', marginTop: 3, letterSpacing: 0.3 },

  chakraBadge:     { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', shadowColor: '#FF9933', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12 },
  rightBadgeGrad:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,153,51,0.5)' },
  rbRing:          { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,153,51,0.35)' },
  rbIcon:          { fontSize: 26, fontWeight: '900', color: '#FF9933', textShadowColor: 'rgba(255,153,51,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, fontStyle: 'italic' },
  rbDot:           { position: 'absolute', bottom: 8, right: 8, width: 10, height: 10, borderRadius: 5 },

  langBarWrap:     { marginHorizontal: 14, marginVertical: 10 },
  langBar:         { flexDirection: 'row', alignItems: 'center', padding: 6 },
  langBtn:         { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3 },
  langBtnLabel:    { fontSize: 9, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 },
  langBtnText:     { fontSize: 13, fontWeight: '700', color: COLORS.text, maxWidth: 110 },
  swapBtn:         { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#FF9933', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },

  cardWrap:        { marginHorizontal: 14, marginBottom: 10 },
  cardInner:       { padding: 16 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLangRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDot:         { width: 10, height: 10, borderRadius: 5 },
  cardLang:        { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  inputField:      { fontSize: 20, color: COLORS.text, minHeight: 110, lineHeight: 30 },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  charCount:       { fontSize: 12, color: COLORS.textSecondary },

  btnShadow:       { shadowColor: '#FF9933', shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 16 },
  translateBtn:    { borderRadius: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  btnShine:        { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  translateBtnText:{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  outputField:     { fontSize: 22, color: COLORS.primary, lineHeight: 32 },
  outputActions:   { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  outBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outBtnIcon:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  outBtnText:      { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  indiaFooter:     { alignItems: 'center', marginTop: 10, marginBottom: 4 },
  triLineFull:     { flexDirection: 'row', width: width * 0.5, height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  triLineSegment:  { flex: 1 },
  jaiHind:         { fontSize: 12, color: 'rgba(255,153,51,0.65)', letterSpacing: 1 },
});
