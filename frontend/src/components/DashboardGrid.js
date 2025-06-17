import WidgetCard from './WidgetCard';

export default function DashboardGrid({ widgets, category, dataSource, modelUsed }) {
  if (!widgets || widgets.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No widgets to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {widgets.map((widget, index) => (
        <WidgetCard
          key={index}
          widget={widget}
          category={category}
          index={index}
          dataSource={dataSource || "AI Research"}
        />
      ))}
    </div>
  );
} 