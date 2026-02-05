import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

// Helper to decode bytes to string
const decode = (data) => new TextDecoder().decode(data);

export class LyricsClient {
    constructor() {
        this._session = new Soup.Session();
        this._decoder = new TextDecoder();
    }

    /**
     * Search and fetch lyrics
     * @param {string} title - Song title
     * @param {string} artist - Artist name
     * @param {string} album - Album name
     * @param {number} duration - Duration in seconds
     */
    async getLyrics(title, artist, album, duration) {
        try {
            // LRCLIB API URL
            const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}&album_name=${encodeURIComponent(album)}&duration=${duration}`;
            
            const msg = Soup.Message.new('GET', url);
            const bytes = await this._session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null);
            
            if (msg.status_code !== Soup.Status.OK) {
                // If direct match fails, try search
                return await this._searchLyrics(title, artist, duration);
            }

            const data = JSON.parse(decode(bytes.get_data()));
            if (data.syncedLyrics) {
                return this._parseLRC(data.syncedLyrics);
            }
            return null;

        } catch (e) {
            console.error("Lyrics fetch error:", e);
            return null;
        }
    }

    async _searchLyrics(title, artist, duration) {
        try {
            const url = `https://lrclib.net/api/search?q=${encodeURIComponent(title + " " + artist)}`;
            const msg = Soup.Message.new('GET', url);
            const bytes = await this._session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null);
            
            const data = JSON.parse(decode(bytes.get_data()));
            // Find closest match by duration
            const match = data.find(item => Math.abs(item.duration - duration) < 3); // 3 sec tolerance
            
            if (match && match.syncedLyrics) {
                return this._parseLRC(match.syncedLyrics);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    _parseLRC(lrcText) {
        const lines = [];
        const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
        
        lrcText.split('\n').forEach(line => {
            const match = line.match(regex);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseFloat("0." + match[3]) * 1000;
                const time = (min * 60 * 1000) + (sec * 1000) + ms;
                const text = match[4].trim();
                
                if (text) {
                    lines.push({ time, text });
                }
            }
        });
        return lines;
    }
}