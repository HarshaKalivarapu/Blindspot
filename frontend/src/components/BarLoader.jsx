const BarLoader = ({ bars = 8, barWidth = 10, barHeight = 70, color = 'bg-[#4ade80]', speed = 1.2, className = '' }) => {
  return (
    <div className={`relative flex justify-center items-end gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`${color} rounded-t-xl origin-bottom animate-barLoader`}
          style={{
            width: barWidth,
            height: barHeight,
            animationDelay: `${(i + 1) * 0.1}s`,
            animationDuration: `${speed}s`,
          }}
        />
      ))}
    </div>
  )
}

export default BarLoader
