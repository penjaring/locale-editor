# Locale Editor - Full Stack Application

A full-stack locale editor application with Bun backend and simple HTML frontend for managing translation files.

## Project Structure

```
locale-editor/
├── server/
│   ├── locales/          # Translation files organized by project/language
│   │   ├── admin/
│   │   ├── pecan/
│   │   └── web/
│   ├── index.ts          # Bun server
│   └── package.json
├── index.html            # Frontend interface
├── .gitignore
└── README.md
```

## Features

- **Multi-language Support**: Edit translations for Indonesian (id) and English (en) by default
- **Add New Languages**: Create new language translations by copying English files
- **Real-time Save**: Save changes directly to the server
- **Security**: Input sanitization and path validation to prevent security vulnerabilities
- **ISO 639-1 Compliance**: Language codes follow the ISO 639-1 standard

## Prerequisites

- [Bun](https://bun.sh/) runtime installed

## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies (if any are added later):
   ```bash
   bun install
   ```

## Running the Application

### Manual Start

1. Start the backend server:
   ```bash
   cd server
   bun run dev
   ```

   The server will start at `http://localhost:3000`

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

### GET `/api/structure`
Returns the structure of locale files for each project folder.

**Response:**
```json
{
  "pecan": ["auth", "books", "common", ...],
  "admin": ["audioVideoBookPages", "auth", ...],
  "web": ["common", "document", ...]
}
```

### GET `/api/languages?folder=<folder>`
Returns available language codes for a specific folder.

**Response:**
```json
{
  "languages": ["en", "id", "es"]
}
```

### GET `/api/locale/?folder=<folder>&lang=<lang>&file=<file>`
Fetches a specific locale file.

**Parameters:**
- `folder`: Project folder (pecan/admin/web)
- `lang`: Language code (ISO 639-1)
- `file`: Filename without extension

**Response:** JSON content of the locale file

### POST `/api/locale`
Saves changes to a locale file.

**Request Body:**
```json
{
  "folder": "pecan",
  "lang": "id",
  "file": "common",
  "data": { ... }
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/language`
Creates a new language by copying English locale files.

**Request Body:**
```json
{
  "langCode": "es",
  "langName": "Español"
}
```

**Response:**
```json
{
  "success": true,
  "langCode": "es",
  "message": "Language 'es' created successfully"
}
```

## Security Features

1. **Input Sanitization**:
   - Language codes validated against ISO 639-1 format (2 lowercase letters)
   - Filenames sanitized to allow only alphanumeric, hyphens, and underscores
   - Folder names restricted to predefined list (pecan, admin, web)

2. **Path Validation**:
   - Directory traversal attacks prevented
   - All paths validated to ensure they stay within the locales directory

3. **CORS**:
   - CORS headers configured for cross-origin requests
   - Can be restricted to specific origins in production

## Usage Guide

1. **Select Language**: Choose a language from the header buttons
2. **Select Project**: Click on tabs (Pecan, Admin, Web) to switch between projects
3. **Edit Translations**: 
   - Expand file sections to see translation keys
   - Edit text in the right column
   - Tokens like `{{variable}}` and `$t(...)` are preserved automatically
4. **Save Changes**: Click the "Simpan" (Save) button to persist changes
5. **Add New Language**: Click "+ Bahasa Baru" and enter the ISO 639-1 code

## Development

To modify the server:
1. Edit `server/index.ts`
2. The server will automatically reload (if using `bun run dev`)

To modify the frontend:
1. Edit `index.html`
2. Refresh your browser to see changes

## ISO 639-1 Language Codes

Common language codes:
- `en` - English
- `id` - Indonesian
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `zh` - Chinese
- `ar` - Arabic
- `pt` - Portuguese
- `ru` - Russian

For a complete list, visit: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes

## License

This project is private and proprietary.
