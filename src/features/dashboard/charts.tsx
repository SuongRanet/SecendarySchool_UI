import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useThemeStore } from '@/stores/theme.store';

/**
 * Chart palette.
 *
 * The colours are fixed hex values rather than CSS variables because the chart
 * library renders to SVG attributes that cannot read custom properties. They are
 * chosen to stay legible on both the light and the dark surface.
 */
export const CHART_COLORS = {
  primary: '#3b6ef5',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#0ea5e9',
  accent: '#0d9488',
  violet: '#7c3aed',
  slate: '#64748b',
} as const;

export const CATEGORICAL_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.violet,
  CHART_COLORS.info,
  CHART_COLORS.success,
  CHART_COLORS.danger,
  CHART_COLORS.slate,
];

const useAxisColors = () => {
  const resolved = useThemeStore((state) => state.resolved);

  return {
    axis: resolved === 'dark' ? '#94a3b8' : '#64748b',
    grid: resolved === 'dark' ? '#334155' : '#e2e8f0',
    tooltipBg: resolved === 'dark' ? '#1e293b' : '#ffffff',
    tooltipBorder: resolved === 'dark' ? '#334155' : '#e2e8f0',
    tooltipText: resolved === 'dark' ? '#f1f5f9' : '#0f172a',
  };
};

export interface ChartFrameProps {
  height?: number;
  children: ReactNode;
}

/** Keeps every chart the same height and responsive width. */
export const ChartFrame = ({ height = 260, children }: ChartFrameProps) => (
  <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      {children as never}
    </ResponsiveContainer>
  </div>
);

export interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color: string }[];
  height?: number;
  stacked?: boolean;
}

export const SimpleBarChart = ({ data, xKey, bars, height = 260, stacked = false }: BarChartProps) => {
  const colors = useAxisColors();

  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
        />
        <YAxis
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.35 }}
          contentStyle={{
            backgroundColor: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
            fontSize: 12,
          }}
        />
        {bars.length > 1 ? (
          <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
        ) : null}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
};

export interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color: string }[];
  height?: number;
}

export const SimpleLineChart = ({ data, xKey, lines, height = 260 }: LineChartProps) => {
  const colors = useAxisColors();

  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: colors.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
        />
        <YAxis
          tick={{ fill: colors.axis, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: colors.tooltipBg,
            border: `1px solid ${colors.tooltipBorder}`,
            borderRadius: 8,
            color: colors.tooltipText,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
};

export interface DonutChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export const DonutChart = ({ data, height = 260, centerLabel, centerValue }: DonutChartProps) => {
  const colors = useAxisColors();
  const hasData = data.some((item) => item.value > 0);

  if (!hasData) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-[var(--text-subtle)]">
        —
      </div>
    );
  }

  return (
    <div className="relative">
      <ChartFrame height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: 8,
              color: colors.tooltipText,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.axis }} />
        </PieChart>
      </ChartFrame>

      {centerValue !== undefined ? (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] flex -translate-y-1/2 flex-col items-center">
          <span className="text-2xl font-semibold text-[var(--text)]">{centerValue}</span>
          {centerLabel ? (
            <span className="text-xs text-[var(--text-muted)]">{centerLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
