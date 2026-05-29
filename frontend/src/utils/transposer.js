export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Maps flat notes to their sharp equivalents for simpler transposition math
export const FLAT_TO_SHARP = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};

/**
 * Transpose a single chord string (with potential bass notes like D/F#) by 'steps' half-steps.
 */
export function transposeChord(chord, steps) {
  // A chord can be Root + Suffix + /Bass
  const parts = chord.split('/');
  
  const transposeNote = (noteStr) => {
    // Regex to capture the root note (e.g., C, C#, Db) and the rest of the chord (e.g., m7, sus4)
    const regex = /^([A-G][#b]?)(.*)$/;
    const match = noteStr.match(regex);
    if (!match) return noteStr; // If it doesn't look like a note, return it unchanged
    
    let root = match[1];
    const suffix = match[2];
    
    if (FLAT_TO_SHARP[root]) root = FLAT_TO_SHARP[root];
    const currentIndex = NOTES.indexOf(root);
    if (currentIndex === -1) return noteStr; // Root note not found
    
    let newIndex = (currentIndex + steps) % 12;
    if (newIndex < 0) newIndex += 12;
    
    return NOTES[newIndex] + suffix;
  };

  return parts.map(transposeNote).join('/');
}

/**
 * Checks if a given string is a valid chord.
 * Includes support for slash chords, numbers, and common modifiers.
 */
export function isChord(word) {
  // Must start with A-G, optional # or b. 
  // Followed by typical modifiers, numbers, or slash bass notes.
  const regex = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?[\w#b\-\+\/\(\)]*$/;
  return regex.test(word);
}

/**
 * Heuristic to determine if a line of text is a "chord line".
 * A line is a chord line if it contains ONLY chords and structural characters.
 */
export function isChordLine(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;

  const words = trimmed.split(/\s+/);
  let chordCount = 0;
  let nonChordCount = 0;
  
  for (const word of words) {
    if (isChord(word)) {
      chordCount++;
    } else {
      // Ignore empty strings, structural characters, or 'x' used for muting
      // We check the word against a strict list of allowed non-chord characters
      if (!/^[\|\-\[\]\(\),x]+$/i.test(word)) {
          nonChordCount++;
      }
    }
  }

  // To be safe, a chord line should mostly be chords and have ZERO non-chords (lyrics)
  return chordCount > 0 && nonChordCount === 0;
}

/**
 * Transpose an entire song text by 'steps' half-steps.
 * It reads line by line, identifies chord lines, and transposes the chords within those lines.
 */
export function transposeText(text, steps) {
  if (steps === 0 || !text) return text;

  const lines = text.split('\n');
  const transposedLines = lines.map(line => {
    if (isChordLine(line)) {
      // Split by spaces but preserve them to maintain perfect alignment
      return line.split(/(\s+)/).map(token => {
        if (token.trim().length === 0) return token; // Preserve spaces exactly
        if (isChord(token)) {
          return transposeChord(token, steps);
        }
        return token; // Return structural delimiters unchanged
      }).join('');
    }
    return line; // Lyrics lines remain unchanged
  });

  return transposedLines.join('\n');
}
