import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

type Props = {
  series: { distanceKm: number; ele: number }[];
  color?: string;
};

export default function ElevationChart({ series, color = "#0077b6" }: Props) {
  const labels = series.map((p) => p.distanceKm.toFixed(1));
  const data = {
    labels,
    datasets: [
      {
        label: "Elevation (m)",
        data: series.map((p) => p.ele),
        fill: true,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.18),
        pointRadius: 0,
        tension: 0.25,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => `km ${items[0].label}`,
          label: (ctx: any) => `${Math.round(ctx.parsed.y)} m`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Distance (km)" },
        ticks: { maxTicksLimit: 8, autoSkip: true },
      },
      y: {
        title: { display: true, text: "Elevation (m)" },
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Line data={data} options={options} />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
