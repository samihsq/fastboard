export default function PromptInput() {
    return (
      <form className="w-full max-w-2xl mx-auto px-4">
        <div className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-2xl shadow-md flex items-center gap-4">
          <textarea
            rows={1}
            placeholder="What kind of dashboard would you like?"
            className="flex-1 resize-none bg-transparent text-white placeholder:text-gray-300  px-5 py-4 outline-none border-none focus:ring-0 text-base"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium mr-3"
          >
            Send
          </button>
        </div>
      </form>
    );
  }
  