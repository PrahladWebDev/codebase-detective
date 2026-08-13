export default function StatCard({ label, value, sub, icon: Icon, accent = false }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-paper-500">{label}</span>
        {Icon && <Icon size={16} className={accent ? 'text-spotlight' : 'text-paper-500'} />}
      </div>
      <span className={`font-display text-2xl font-semibold ${accent ? 'text-spotlight' : 'text-paper-100'}`}>{value}</span>
      {sub && <span className="text-xs text-paper-500">{sub}</span>}
    </div>
  );
}
