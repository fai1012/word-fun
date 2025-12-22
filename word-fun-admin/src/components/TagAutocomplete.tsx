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
        <div className="relative" ref={autocompleteRef} style={{ width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: '#f8f9fa',
                    border: '1px solid #ced4da',
                    minHeight: '42px',
                    alignItems: 'center'
                }}
            >
                {selectedTags.map(tag => (
                    <span
                        key={tag}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#007bff',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        {tag}
                        <button
                            onClick={(e) => { e.preventDefault(); handleRemoveTag(tag); }}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
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
                    style={{
                        flex: '1',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '14px',
                        minWidth: '80px',
                        padding: '2px'
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput) {
                            e.preventDefault();
                            handleAddTag(tagInput);
                        }
                    }}
                />
            </div>

            {showAutocomplete && (tagInput || filteredAutocompleteTags.length > 0) && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 100,
                        width: '100%',
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #ced4da',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        padding: '8px'
                    }}
                >
                    {filteredAutocompleteTags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: tagInput ? '8px' : '0', maxHeight: '150px', overflowY: 'auto' }}>
                            {filteredAutocompleteTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={(e) => { e.preventDefault(); handleAddTag(tag); }}
                                    style={{
                                        padding: '4px 10px',
                                        background: '#e9ecef',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '16px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Tag size={10} color="#6c757d" />
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                    {tagInput && !availableTags.includes(tagInput) && (
                        <button
                            onClick={(e) => { e.preventDefault(); handleAddTag(tagInput); }}
                            style={{
                                width: '100%',
                                padding: '8px',
                                textAlign: 'left',
                                background: '#f8f9fa',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#007bff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
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
