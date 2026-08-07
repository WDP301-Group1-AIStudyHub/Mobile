import React from 'react'
import { Text, View } from 'react-native'
import { Leaf } from 'lucide-react-native'
import { FontSize } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

interface BrandLogoProps {
  compact?: boolean
  size?: number
  textSize?: number
}

export default function BrandLogo({
  compact = false,
  size = 32,
  textSize,
}: BrandLogoProps) {
  const C = useColors()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(10, size * 0.35),
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: '#f8f4df',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Leaf size={Math.max(16, size * 0.52)} color={C.primary} strokeWidth={2.4} />
      </View>

      {!compact && (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontSize: textSize ?? FontSize.base,
            fontWeight: '800',
            color: C.text,
          }}
        >
          AI Study Hub
        </Text>
      )}
    </View>
  )
}
