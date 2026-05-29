import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { MessageCircle, Plus, Sparkles } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../../components/ui/VideoBg'
import Card from '../../../components/ui/Card'
import ThemeToggle from '../../../components/ui/ThemeToggle'
import { FontSize, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'

const mockChats = [
  { id: '1', title: 'Quantum Entanglement Explained', lastMessage: 'Can you explain quantum superposition in simple terms?', time: '2h ago', model: 'GPT-4o' },
  { id: '2', title: 'Essay on Neural Networks', lastMessage: 'Help me structure my essay introduction.', time: '5h ago', model: 'GPT-4o' },
  { id: '3', title: 'Economic Shifts Analysis', lastMessage: 'Summarize the key findings from the uploaded PDF.', time: 'Yesterday', model: 'Claude 3.5' },
  { id: '4', title: 'Philosophy of Digital Reality', lastMessage: 'What are the main arguments in this text?', time: '2 days ago', model: 'GPT-4o' },
]

export default function ChatIndexPage() {
  const C = useColors()

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    container: { flex: 1, padding: Spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
    title: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    subtitle: { fontSize: FontSize.sm, color: C.muted, marginTop: 4 },
    newBtn: { borderRadius: 14, overflow: 'hidden' },
    newBtnGradient: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    list: { gap: Spacing.sm, paddingBottom: Spacing.xxl },
    chatCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    chatCardPressed: { opacity: 0.8 },
    chatIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chatInfo: { flex: 1, gap: 3 },
    chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatTitle: { fontSize: FontSize.sm, fontWeight: '600', color: C.text, flex: 1, marginRight: Spacing.sm },
    chatTime: { fontSize: FontSize.xs, color: C.muted },
    chatPreview: { fontSize: FontSize.xs, color: C.mutedLight },
    modelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    modelText: { fontSize: FontSize.xs, color: C.accent, fontWeight: '500' },
  }), [C])

  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>AI Chats</Text>
              <Text style={styles.subtitle}>Your conversation history</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(app)/chat/new')}
              style={styles.newBtn}
            >
              <LinearGradient
                colors={C.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBtnGradient}
              >
                <Plus size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
            <ThemeToggle size={44} />
          </View>

          {/* Chat List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {mockChats.map((chat) => (
              <Pressable
                key={chat.id}
                onPress={() => router.push(`/(app)/chat/${chat.id}`)}
              >
                {({ pressed }) => (
                  <Card
                    elevated={pressed}
                    style={[styles.chatCard, pressed && styles.chatCardPressed]}
                    row
                    padding="md"
                  >
                    <View style={styles.chatIcon}>
                      <MessageCircle size={20} color={C.primaryLight} />
                    </View>
                    <View style={styles.chatInfo}>
                      <View style={styles.chatTopRow}>
                        <Text style={styles.chatTitle} numberOfLines={1}>
                          {chat.title}
                        </Text>
                        <Text style={styles.chatTime}>{chat.time}</Text>
                      </View>
                      <Text style={styles.chatPreview} numberOfLines={1}>
                        {chat.lastMessage}
                      </Text>
                      <View style={styles.modelBadge}>
                        <Sparkles size={10} color={C.accent} />
                        <Text style={styles.modelText}>{chat.model}</Text>
                      </View>
                    </View>
                  </Card>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </VideoBg>
  )
}
