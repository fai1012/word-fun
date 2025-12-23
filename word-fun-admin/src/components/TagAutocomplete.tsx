import React, { useState, useEffect, useRef } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { wordPackService } from '../services/wordPackService';

interface TagAutocompleteProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
}

const TagAutocomplete: React.FC<TagAutocompleteProps> = ({ selectedTags, onChange, placeholder }) => {
    const [tagInput, setTagInput] = useState('');
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadTags = async () => {
            try {
                const tags = await wordPackService.getGlobalTags();
                setAvailableTags(tags);
            } catch (err) {
                console.error('Failed to load global tags:', err);
            }
        };
        loadTags();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
                setShowAutocomplete(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !selectedTags.includes(trimmedTag)) {
            onChange([...selectedTags, trimmedTag]);
        }
        setTagInput('');
        setShowAutocomplete(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onChange(selectedTags.filter(tag => tag !== tagToRemove));
    };

    const filteredAutocompleteTags = availableTags.filter(
        tag => tag.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(tag)
    );

    return (
        <div className="relative w-full" ref={autocompleteRef}>
            <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-gray-50 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all min-h-[42px] items-center">
                {selectedTags.map(tag => (
                    <span
                        key={tag}
                        className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-200 shadow-sm"
                    >
                        {tag}
                        <button
                            onClick={(e) => { e.preventDefault(); handleRemoveTag(tag); }}
                            className="text-blue-400 hover:text-blue-600 focus:outline-none"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowAutocomplete(true);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    placeholder={selectedTags.length === 0 ? (placeholder || "Add tags...") : ""}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[80px] p-0.5 placeholder-gray-400"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput) {
                            e.preventDefault();
                            handleAddTag(tagInput);
                        }
                    }}
                />
            </div>

            {showAutocomplete && (tagInput || filteredAutocompleteTags.length > 0) && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg p-2 animate-fade-in">
                    {filteredAutocompleteTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 max-h-[150px] overflow-y-auto">
                            {filteredAutocompleteTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={(e) => { e.preventDefault(); handleAddTag(tag); }}
                                    className="px-3 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors flex items-center gap-1"
                                >
                                    <Tag size={10} className="text-gray-400" />
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                    {tagInput && !availableTags.includes(tagInput) && (
                        <button
                            onClick={(e) => { e.preventDefault(); handleAddTag(tagInput); }}
                            className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold text-blue-600 transition-colors flex items-center gap-2"
                        >
                            <Plus size={12} />
                            Create tag "{tagInput}"
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagAutocomplete;
