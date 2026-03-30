import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHistory, clearHistory } from '../../services/api';
import { getLanguageName, getLanguageFlag } from '../../constants/languages';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/config';

export default function HistoryScreen() {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, []));

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all translation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          try { await clearHistory(); setHistory([]); }
          catch { Alert.alert('Error', 'Failed to clear history.'); }
        }
      }
    ]);
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + '  ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  return (
    <LinearGradient colors={GRADIENTS.background} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={GRADIENTS.header} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Ionicons name="time" size={24} color="#fff" />
        <Text style={styles.headerTitle}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <FlatList
        data={history}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.langPair}>
                {getLanguageFlag(item.sourceLang)} {getLanguageName(item.sourceLang)}
                {'  →  '}
                {getLanguageFlag(item.targetLang)} {getLanguageName(item.targetLang)}
              </Text>
              <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
            </View>
            <Text style={styles.inputText} numberOfLines={2}>{item.inputText}</Text>
            <Text style={styles.translatedText} numberOfLines={2}>{item.translatedText}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchHistory(); }}
            tintColor={COLORS.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={64} color="#333" />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>Your translations will appear here.</Text>
          </View>
        }
        contentContainerStyle={history.length === 0 && styles.emptyContainer}
      />
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: 'transparent' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 16 },
  headerTitle:  { flex: 1, fontSize: 22, fontWeight: '700', color: '#fff' },
  clearBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText:    { color: '#fff', fontSize: 14, fontWeight: '600' },
  item:         { backgroundColor: COLORS.surface, padding: 16 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  langPair:     { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  timestamp:    { fontSize: 11, color: COLORS.textSecondary },
  inputText:    { fontSize: 15, color: COLORS.text, marginBottom: 4 },
  translatedText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  sep:          { height: 1, backgroundColor: COLORS.border },
  emptyContainer: { flex: 1 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle:   { fontSize: 20, fontWeight: '600', color: COLORS.text },
  emptyText:    { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});
