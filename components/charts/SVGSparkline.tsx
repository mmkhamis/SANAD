import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

import { COLORS } from '../../constants/colors';

interface SVGSparklineProps {
  data: number[];
  width: number;
  height: number;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

/**
 * SVG sparkline / area chart matching Claude Design exactly:
 *
 * Stroke: 2px, oklch(72% 0.16 290) = #A278EA
 * Fill: linearGradient from strokeColor/60% at top to transparent at bottom
 * Smooth cubic bezier interpolation between data points
 */
export const SVGSparkline = React.memo(function SVGSparkline({
  data,
  width,
  height,
  strokeColor = COLORS.claude.sparkPurple,
  fillColor = COLORS.claude.sparkPurpleFill,
  fillOpacity = 0.28,
  strokeWidth = 2,
}: SVGSparklineProps): React.ReactElement | null {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '' };

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 4;
    const drawW = width - padding * 2;
    const drawH = height - padding * 2;

    // Convert data points to x,y coordinates
    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * drawW,
      y: padding + drawH - ((val - minVal) / range) * drawH,
    }));

    // Build smooth cubic bezier path
    let line = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Control points with 0.3 tension
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      line += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    // Area path: line + close to bottom
    const lastPt = points[points.length - 1];
    const firstPt = points[0];
    const area = `${line} L${lastPt.x},${height} L${firstPt.x},${height} Z`;

    return { linePath: line, areaPath: area };
  }, [data, width, height]);

  if (data.length < 2) return null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGrad id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillColor} stopOpacity={fillOpacity} />
            <Stop offset="1" stopColor={fillColor} stopOpacity={0} />
          </SvgGrad>
        </Defs>
        {/* Area fill */}
        <Path d={areaPath} fill="url(#sparkFill)" />
        {/* Stroke line */}
        <Path d={linePath} stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    </View>
  );
});

/**
 * Mini inline sparkline for holding rows (44×18 default).
 */
export const MiniSparkline = React.memo(function MiniSparkline({
  data,
  color,
  width = 44,
  height = 18,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}): React.ReactElement | null {
  return (
    <SVGSparkline
      data={data}
      width={width}
      height={height}
      strokeColor={color}
      fillColor={color}
      fillOpacity={0.15}
      strokeWidth={1.5}
    />
  );
});
