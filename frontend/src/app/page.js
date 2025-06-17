import GradientBackground from "../components/background";
import PromptInput from "../components/search";
export default function Home() {
  return (
    <div className="absolute w-full h-full">
      <GradientBackground />
      <div className="relative z-20 flex flex-col items-center justify-center h-full gap-8 px-4">
        <h1 className="text-5xl font-bold text-white">fastboard</h1>
        <PromptInput />
      </div>
    </div>
  );
}
