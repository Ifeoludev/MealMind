// Reusable tag/pill input — press Enter or comma to add a tag, click × to remove

import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder = "Type and press Enter" }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    // Backspace on empty input removes the last tag
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div className="w-full min-h-[42px] px-3 py-2 rounded-lg border border-gray-200 bg-white flex flex-wrap gap-2 items-center focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100 transition cursor-text">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-green-600 hover:text-green-800 leading-none cursor-pointer"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] text-sm text-black placeholder-gray-400 outline-none bg-transparent"
      />
    </div>
  );
}
