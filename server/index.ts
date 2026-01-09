import { join, dirname } from 'path';
import { mkdir, readdir, readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';

const PORT = 3000;

// Input sanitization utilities
const sanitizeFilename = (filename: string): string => {
  // Only allow alphanumeric, hyphens, and underscores
  return filename.replace(/[^a-zA-Z0-9_-]/g, '');
};

const sanitizeLanguageCode = (code: string): string => {
  // ISO 639-1 codes are 2 lowercase letters
  const sanitized = code.toLowerCase().trim();
  if (!/^[a-z]{2}$/.test(sanitized)) {
    throw new Error('Invalid language code. Must be 2 lowercase letters (ISO 639-1)');
  }
  return sanitized;
};

const sanitizeFolderName = (folder: string): string => {
  // Only allow specific folder names
  const allowedFolders = ['pecan', 'admin', 'web'];
  if (!allowedFolders.includes(folder)) {
    throw new Error('Invalid folder name');
  }
  return folder;
};

// Path validation to prevent directory traversal
const validatePath = (basePath: string, targetPath: string): boolean => {
  const resolvedBase = join(import.meta.dir, basePath);
  const resolvedTarget = join(import.meta.dir, targetPath);
  return resolvedTarget.startsWith(resolvedBase);
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve static files (HTML)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const htmlPath = join(import.meta.dir, '..', 'index.html');
        const html = await readFile(htmlPath);
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response('HTML file not found', { 
          status: 404,
          headers: corsHeaders,
        });
      }
    }

    // API: Get locale file structure
    if (url.pathname === '/api/structure' && req.method === 'GET') {
      try {
        const structure = {
          pecan: await readdir(join(import.meta.dir, 'locales', 'pecan', 'en')),
          admin: await readdir(join(import.meta.dir, 'locales', 'admin', 'en')),
          web: await readdir(join(import.meta.dir, 'locales', 'web', 'en')),
        };

        // Remove .json extension from filenames
        const processedStructure = {
          pecan: structure.pecan.map(f => f.replace('.json', '')),
          admin: structure.admin.map(f => f.replace('.json', '')),
          web: structure.web.map(f => f.replace('.json', '')),
        };

        return new Response(JSON.stringify(processedStructure), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to read structure' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    // API: Get available languages
    if (url.pathname === '/api/languages' && req.method === 'GET') {
      try {
        const folder = url.searchParams.get('folder') || 'pecan';
        const sanitizedFolder = sanitizeFolderName(folder);
        
        const folderPath = join(import.meta.dir, 'locales', sanitizedFolder);
        const languages = await readdir(folderPath);
        
        // Filter only directories
        const validLanguages = [];
        for (const lang of languages) {
          const langPath = join(folderPath, lang);
          const stat = await Bun.file(langPath).stat();
          if (stat.isDirectory()) {
            validLanguages.push(lang);
          }
        }

        return new Response(JSON.stringify({ languages: validLanguages }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to read languages' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    // API: Get specific locale file
    if (url.pathname.startsWith('/api/locale/') && req.method === 'GET') {
      try {
        const folder = url.searchParams.get('folder');
        const lang = url.searchParams.get('lang');
        const file = url.searchParams.get('file');

        if (!folder || !lang || !file) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const sanitizedFolder = sanitizeFolderName(folder);
        const sanitizedLang = sanitizeLanguageCode(lang);
        const sanitizedFile = sanitizeFilename(file);

        const filePath = join('locales', sanitizedFolder, sanitizedLang, `${sanitizedFile}.json`);
        
        // Validate path to prevent directory traversal
        if (!validatePath('locales', filePath)) {
          return new Response(JSON.stringify({ error: 'Invalid path' }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const fullPath = join(import.meta.dir, filePath);
        if (!existsSync(fullPath)) {
          return new Response(JSON.stringify({ error: 'File not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const content = await readFile(fullPath, 'utf-8');
        const jsonData = JSON.parse(content);

        return new Response(JSON.stringify(jsonData), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('Error reading locale file:', error);
        return new Response(JSON.stringify({ error: 'Failed to read file' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    // API: Save locale file
    if (url.pathname === '/api/locale' && req.method === 'POST') {
      try {
        const body = await req.json() as any;
        const { folder, lang, file, data } = body;

        if (!folder || !lang || !file || !data) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const sanitizedFolder = sanitizeFolderName(folder);
        const sanitizedLang = sanitizeLanguageCode(lang);
        const sanitizedFile = sanitizeFilename(file);

        const filePath = join('locales', sanitizedFolder, sanitizedLang, `${sanitizedFile}.json`);
        
        // Validate path
        if (!validatePath('locales', filePath)) {
          return new Response(JSON.stringify({ error: 'Invalid path' }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const fullPath = join(import.meta.dir, filePath);
        
        // Ensure directory exists
        await mkdir(dirname(fullPath), { recursive: true });
        
        // Write file with proper formatting
        await writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('Error saving locale file:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to save file',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    // API: Add new language
    if (url.pathname === '/api/language' && req.method === 'POST') {
      try {
        const body = await req.json() as any;
        const { langCode, langName } = body;

        if (!langCode || !langName) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        const sanitizedLangCode = sanitizeLanguageCode(langCode);

        // Copy English locale files to new language for all folders
        const folders = ['pecan', 'admin', 'web'];
        
        for (const folder of folders) {
          const sourcePath = join(import.meta.dir, 'locales', folder, 'en');
          const targetPath = join(import.meta.dir, 'locales', folder, sanitizedLangCode);

          // Check if language already exists
          if (existsSync(targetPath)) {
            return new Response(JSON.stringify({ 
              error: `Language '${sanitizedLangCode}' already exists` 
            }), {
              status: 409,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            });
          }

          // Create target directory
          await mkdir(targetPath, { recursive: true });

          // Copy all files from English to new language
          const files = await readdir(sourcePath);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const sourceFile = join(sourcePath, file);
              const targetFile = join(targetPath, file);
              await copyFile(sourceFile, targetFile);
            }
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          langCode: sanitizedLangCode,
          message: `Language '${sanitizedLangCode}' created successfully`
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('Error adding new language:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to add language',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }
    }

    // 404 for all other routes
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`🚀 Server running at http://localhost:${PORT}`);
console.log(`📝 Locale editor available at http://localhost:${PORT}`);
