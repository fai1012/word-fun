import sys
import json
import spacy
from spellchecker import SpellChecker

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    # Fallback if model not found (though it should be installed)
    print(json.dumps({"error": "spaCy model not found"}))
    sys.exit(1)

spell = SpellChecker()

def validate_word(text):
    # Basic cleanup
    text = text.strip()
    if not text:
        return {"isValid": False, "language": "en"}

    # Chinese check (same logic as before)
    if any('\u4e00' <= char <= '\u9fa5' for char in text):
        return {"isValid": True, "language": "zh"}

    # English validation using pyspellchecker
    # We allow words that are in the dictionary
    is_valid_spelling = text.lower() in spell
    
    # Process with spaCy for lemma and further validation
    doc = nlp(text)
    
    # Extract lemma
    root_form = " ".join([token.lemma_ for token in doc])
    
    # Heuristic for validity: 
    # 1. Spelled correctly is a very strong signal
    # 2. If misspelled but is a common POS? Actually, misspelling often gets tagged as NOUN/PROPN.
    # 3. For single words, we should trust the spellchecker more.
    is_alpha = all(char.isalpha() or char.isspace() or char == '-' for char in text)
    
    # If it's a single token, we should be strict
    if len(doc) == 1:
        token = doc[0]
        # Only accept misspelled single words if they are capitalized (likely a name)
        # and recognized as a proper noun.
        is_proper_noun = token.pos_ == "PROPN" and text[0].isupper()
        is_valid = is_alpha and (is_valid_spelling or is_proper_noun)
    else:
        # For multi-word phrases, we use a more relaxed check but still require is_alpha
        is_valid = is_alpha and (is_valid_spelling or any(token.pos_ in ["NOUN", "VERB", "ADJ"] for token in doc))

    return {
        "isValid": bool(is_valid),
        "rootForm": root_form,
        "language": "en"
    }

def lemmatize_sentence(text):
    doc = nlp(text)
    return [{"text": token.text, "lemma": token.lemma_, "pos": token.pos_} for token in doc]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No word provided"}))
        sys.exit(1)
    
    if sys.argv[1] == "--sentence" and len(sys.argv) > 2:
        sentence_input = sys.argv[2]
        try:
            # Check if it's a JSON array of sentences
            sentences = json.loads(sentence_input)
            if isinstance(sentences, list):
                results = [lemmatize_sentence(s) for s in sentences]
                print(json.dumps(results))
            else:
                result = lemmatize_sentence(sentence_input)
                print(json.dumps(result))
        except json.JSONDecodeError:
            # Fallback for plain string
            result = lemmatize_sentence(sentence_input)
            print(json.dumps(result))
    else:
        word = sys.argv[1]
        result = validate_word(word)
        print(json.dumps(result))
