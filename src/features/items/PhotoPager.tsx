import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { PhotoTile } from "../../ui/PhotoTile";
import { color } from "../../ui/theme";

/** Full-width photos you swipe through, with dots when there's more than one. */
export function PhotoPager({ urls, dimmed = false }: { urls: string[]; dimmed?: boolean }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  if (urls.length <= 1) {
    return <PhotoTile uri={urls[0]} rounded={false} dimmed={dimmed} style={{ width, aspectRatio: 1 }} />;
  }
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        accessibilityLabel={`Photo ${page + 1} of ${urls.length}`}
      >
        {urls.map((uri) => (
          <PhotoTile key={uri} uri={uri} rounded={false} dimmed={dimmed} style={{ width, aspectRatio: 1 }} />
        ))}
      </ScrollView>
      <View style={styles.dots} pointerEvents="none">
        {urls.map((uri, i) => (
          <View key={uri} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { position: "absolute", left: 0, right: 0, bottom: 18, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(31,78,121,0.3)" },
  dotOn: { width: 18, backgroundColor: color.bay },
});
