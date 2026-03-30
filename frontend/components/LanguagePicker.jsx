import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList,
  TextInput, StyleSheet, SafeAreaView, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES } from '../constants/languages';
import { COLORS, GRADIENTS } from '../constants/config';

export default function LanguagePicker({ visible, onSelect, onClose, showAuto = true }) {
  const [search, setSearch] = useState('');

  const filtered = LANGUAGES.filter(lang => {
    if (!showAuto && lang.code === 'auto') return false;
    return lang.name.toLowerCase().includes(search.toLowerCase()) ||
           lang.code.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (item) => { onSelect(item); onClose(); setSearch(''); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <LinearGradient colors={GRADIENTS.header} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={styles.triBar}>
              {['#FF9933','#FFFFFF','#138808'].map(c => <View key={c} style={[styles.triStripe, { backgroundColor: c }]} />)}
            </View>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>🇮🇳  Select Language</Text>
            </View>
          </LinearGradient>

          {/* Search */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color={COLORS.primary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages... / भाषा खोजें..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <View style={styles.flagBox}>
                  <Text style={styles.flag}>{item.flag}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.langName}>{item.name}</Text>
                  <Text style={styles.langCode}>{item.code.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header:      { paddingBottom: 10 },
  triBar:      { flexDirection: 'row', height: 3 },
  triStripe:   { flex: 1 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10 },
  backBtn:     { padding: 8 },
  title:       { fontSize: 18, fontWeight: '700', color: '#fff', marginLeft: 6 },
  searchWrap:  { padding: 12 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 8, borderWidth: 1, borderColor: 'rgba(255,153,51,0.25)' },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  flagBox:     { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  flag:        { fontSize: 22 },
  itemInfo:    { flex: 1 },
  langName:    { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  langCode:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sep:         { height: 1, backgroundColor: 'rgba(255,153,51,0.1)', marginLeft: 70 },
});
