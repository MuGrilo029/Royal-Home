/**
 * Utilitários para lidar com datas (YYYY-MM-DD) sem problemas de fuso horário.
 */

/**
 * Converte uma string 'YYYY-MM-DD' ou ISO Timestamp em um objeto Date local (meia-noite).
 * Evita o problema onde '2023-10-25' vira '2023-10-24 21:00' devido ao GMT-3.
 */
export const parseISO = (dateStr: string): Date => {
    if (!dateStr) return new Date();

    // Se for um timestamp ISO completo (contém T ou espaço e :), tenta dar parse direto
    // mas ajustando para meio-dia para evitar problemas de fuso no Dashboard
    if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.includes(':'))) {
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    // Mês no JS é 0-indexed (Janeiro = 0)
    return new Date(year, month - 1, day, 12, 0, 0); // Usamos meio-dia para garantir margem de erro
};

/**
 * Verifica se uma data está dentro do período selecionado.
 * Centraliza a lógica para evitar discrepâncias entre telas.
 */
export const isInRange = (
    dateString: string,
    timeRange: 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM',
    options: {
        customStart?: string;
        customEnd?: string;
        selectedMonth?: number;
        selectedYear?: number;
    } = {}
) => {
    if (!dateString) return false;

    const dateToCheck = parseISO(dateString);
    dateToCheck.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { customStart, customEnd, selectedMonth, selectedYear } = options;

    if (timeRange === 'CUSTOM') {
        if (customStart && dateToCheck < parseISO(customStart)) return false;
        if (customEnd) {
            const endLimit = parseISO(customEnd);
            endLimit.setHours(23, 59, 59, 999);
            if (dateToCheck > endLimit) return false;
        }
        return true;
    }

    if (timeRange === 'TODAY') return dateToCheck.getTime() === today.getTime();

    if (timeRange === 'WEEK') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return dateToCheck >= weekAgo && dateToCheck <= today;
    }

    if (timeRange === 'MONTH') {
        const month = selectedMonth ?? today.getMonth();
        const year = selectedYear ?? today.getFullYear();
        return dateToCheck.getMonth() === month && dateToCheck.getFullYear() === year;
    }

    if (timeRange === 'YEAR') {
        const year = selectedYear ?? today.getFullYear();
        return dateToCheck.getFullYear() === year;
    }

    return true;
};

/**
 * Converte um objeto Date em uma string 'YYYY-MM-DD' segura para o banco.
 * Utiliza o padrão sueco ('sv') que é idêntico ao ISO YYYY-MM-DD.
 */
export const formatISO = (date: Date): string => {
    return date.toLocaleDateString('sv');
};

/**
 * Formata uma string 'YYYY-MM-DD' para o padrão brasileiro 'DD/MM/YYYY'.
 */
export const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

/**
 * Compara se duas datas (strings ISO) são do mesmo mês e ano.
 */
export const isSameMonth = (dateStrA: string, dateStrB: string): boolean => {
    const dateA = parseISO(dateStrA);
    const dateB = parseISO(dateStrB);
    return dateA.getMonth() === dateB.getMonth() && dateA.getFullYear() === dateB.getFullYear();
};

/**
 * Gera um UUID v4 de forma segura, com fallback para contextos não seguros.
 */
export const getUUID = (): string => {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {
        // Silenciosamente falha para o fallback
    }

    // Fallback: Gerador simples de ID único
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Formata um número para moeda brasileira (BRL).
 */
export const formatCurrency = (value: number): string => {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Converte cor hex para RGB (r g b)
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    // Remove # se presente
    const cleanHex = hex.replace('#', '');
    
    // Valida formato hex
    if (!/^[0-9A-F]{6}$/i.test(cleanHex)) {
        return null;
    }
    
    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16)
    };
};

/**
 * Converte RGB para string "r g b" para uso em CSS var()
 */
export const rgbToString = (r: number, g: number, b: number): string => {
    return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
};

/**
 * Lightens or darkens a color by a percentage
 */
export const adjustLightness = (hex: string, percent: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const adjust = (val: number, pct: number) => {
        if (pct > 0) {
            // Lighten: move towards 255
            return val + (255 - val) * (pct / 100);
        } else {
            // Darken: move towards 0
            return val * (1 + pct / 100);
        }
    };
    
    const r = Math.max(0, Math.min(255, adjust(rgb.r, percent)));
    const g = Math.max(0, Math.min(255, adjust(rgb.g, percent)));
    const b = Math.max(0, Math.min(255, adjust(rgb.b, percent)));
    
    return `#${[r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase()}`;
};

/**
 * Gera a paleta de cores wine baseada em uma cor primária
 */
export const generateWinePalette = (primaryColor: string) => {
    const rgb = hexToRgb(primaryColor);
    if (!rgb) {
        // Fallback para a paleta padrão
        return {
            50: '247 247 247',
            100: '232 232 232',
            200: '212 212 212',
            300: '163 163 163',
            400: '115 115 115',
            500: '82 82 82',
            600: '64 64 64',
            700: '51 51 51',
            800: '38 38 38',
            900: '26 26 26',
            950: '13 13 13'
        };
    }

    // Generate shades
    const shades: Record<string, string> = {};
    const percentages = {
        50: 95,
        100: 90,
        200: 75,
        300: 60,
        400: 40,
        500: 20,
        600: 0,
        700: -20,
        800: -40,
        900: -60,
        950: -80
    };

    Object.entries(percentages).forEach(([level, pct]) => {
        const adjustedHex = adjustLightness(primaryColor, pct);
        const adjustedRgb = hexToRgb(adjustedHex);
        if (adjustedRgb) {
            shades[level] = rgbToString(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
        }
    });

    return shades;
};

/**
 * Aplica as cores dinâmicas da empresa aos CSS variables
 */
export const applyThemeColors = (primaryColor?: string, secondaryColor?: string) => {
    const root = document.documentElement;
    
    if (primaryColor) {
        root.style.setProperty('--company-primary', primaryColor);
        
        // Gera e aplica a paleta wine dinamicamente
        const palette = generateWinePalette(primaryColor);
        Object.entries(palette).forEach(([level, rgbString]) => {
            root.style.setProperty(`--color-wine-${level}`, rgbString);
        });
    }
    
    if (secondaryColor) {
        root.style.setProperty('--company-secondary', secondaryColor);
    }
};
