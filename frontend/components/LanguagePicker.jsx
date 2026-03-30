import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList,
  TextInput, StyleSheet, SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES } from '../constants/languages';
import { COLORS } from '../constants/config';

export default function LanguagePicker({ visible, onSelect, onClose, showAuto = true }) {
  const [search, setSearch] = useState('');

  const filtered = LANGUAGES.filter(lang => {
    if (!showAuto && lang.code === 'auto') return false;
    return (
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleSelect = (item) => {
    onSelect(item);
    onClose();
    setSearch('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { onClose(); setSearch(''); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Select Language</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages..."
              placeholderTextColor="#555"
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
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
              <Text style={styles.flag}>{item.flag}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.langName}>{item.name}</Text>
                <Text style={styles.langCode}>{item.code.toUpperCase()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#444" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:     { padding: 8 },
  title:       { fontSize: 18, fontWeight: '600', color: COLORS.text, marginLeft: 6 },
  searchWrap:  { padding: 12 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  flag:        { fontSize: 24, marginRight: 14 },
  itemInfo:    { flex: 1 },
  langName:    { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  langCode:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sep:         { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
});
