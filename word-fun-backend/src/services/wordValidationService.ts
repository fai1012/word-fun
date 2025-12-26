import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class WordValidationService {
    async validateWord(text: string): Promise<{ isValid: boolean; rootForm?: string; language: 'en' | 'zh' }> {
        const isChinese = /[\u4e00-\u9fa5]/.test(text);

        if (isChinese) {
            // Placeholder for Chinese validation persists
            return { isValid: true, language: 'zh' };
        }

        try {
            // Call Python script for English validation and lemmatization
            const { stdout } = await execAsync(`python3 validate_word.py "${text.replace(/"/g, '\\"')}"`);
            const result = JSON.parse(stdout);

            return {
                isValid: result.isValid,
                rootForm: result.rootForm,
                language: 'en'
            };
        } catch (error) {
            console.error('[WordValidationService] Python bridge error:', error);
            // Fallback to basic valid format if python fails
            const isValidFormat = /^[a-zA-Z\s-]+$/.test(text);
            return { isValid: isValidFormat, language: 'en' };
        }
    }

    async getSentenceLemmas(text: string | string[]): Promise<any> {
        try {
            const input = typeof text === 'string' ? text : JSON.stringify(text);
            const { stdout } = await execAsync(`python3 validate_word.py --sentence "${input.replace(/"/g, '\\"')}"`);
            return JSON.parse(stdout);
        } catch (error) {
            console.error('[WordValidationService] Sentence lemmatization error:', error);
            return typeof text === 'string' ? [] : text.map(() => []);
        }
    }
}

export const wordValidationService = new WordValidationService();
