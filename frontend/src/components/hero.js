export default function Hero() {
    return (
<div className="relative w-full h-screen overflow-hidden bg-black text-white">
  {/* 🔮 Gradient blobs */}
  <div className="absolute -inset-0 z-0">
    <div className="absolute w-[30rem] h-[30rem] bg-pink-500/30 rounded-full blur-3xl top-0 left-0 animate-blob animation-delay-2000" />
    <div className="absolute w-[30rem] h-[30rem] bg-purple-500/30 rounded-full blur-3xl top-40 left-1/2 animate-blob" />
    <div className="absolute w-[30rem] h-[30rem] bg-blue-500/30 rounded-full blur-3xl bottom-0 left-1/3 animate-blob animation-delay-4000" />
  </div>

  {/* 🧊 Frost pane over the blobs */}
  <div className="absolute inset-0 z-10 backdrop-blur-2xl bg-black/10" />
  
  {/* 💬 Actual content */}
  <div className="relative z-20 flex items-center justify-center h-full">
    <h1 className="text-5xl font-bold">Fastboard</h1>
  </div>
</div>
    );
  }
  