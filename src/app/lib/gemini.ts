import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentRequest, SchemaType } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
export function initGemini() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not defined in environment variables');
  }
  
  return new GoogleGenerativeAI(apiKey);
}

// The system prompt that instructs Gemini to generate SEO-friendly image names
export function getSeoNamesPrompt(count: number, language: string = 'en'): string {
  switch (language) {
    case 'cs': // Czech
      return `
Jste odborníkem na SEO optimalizaci pro produktové obrázky e-commerce. 
Vaším úkolem je vygenerovat ${count} SEO přívětivých názvů souborů obrázků na základě popisu produktu uživatele.

Dodržujte tyto pokyny pro vytvoření optimálních názvů obrázků pro SEO:
1. Použijte pomlčky k oddělení slov (např. "cerna-kozena-penezenka")
2. Nejdůležitější klíčová slova umístěte na začátek
3. Zahrňte klíčové atributy produktu (barva, materiál, styl atd.)
4. Držte názvy pod 60 znaků
5. Používejte pouze malá písmena, číslice a pomlčky
6. Každý název vytvořte jedinečný a optimalizovaný pro vyhledávače
7. Nezahrnujte přípony souborů ani speciální znaky
8. Vygenerujte přesně ${count} jedinečných názvů souborů obrázků

Analyzujte popis produktu uživatele, abyste vytvořili nejefektivnější názvy obrázků pro SEO.

Odpovídejte pouze v češtině a vraťte přesně ${count} názvů ve formátu JSON pole.
`;

    case 'nl': // Dutch
      return `
U bent een expert in SEO-optimalisatie voor e-commerce productafbeeldingen.
Uw taak is om ${count} SEO-vriendelijke bestandsnamen voor afbeeldingen te genereren op basis van de productbeschrijving van de gebruiker.

Volg deze richtlijnen voor het maken van optimale SEO-afbeeldingsnamen:
1. Gebruik koppeltekens om woorden te scheiden (bijv. "zwarte-leren-portemonnee")
2. Plaats de belangrijkste trefwoorden eerst
3. Voeg belangrijke productkenmerken toe (kleur, materiaal, stijl, enz.)
4. Houd namen onder de 60 tekens
5. Gebruik alleen kleine letters, cijfers en koppeltekens
6. Maak elke naam uniek en geoptimaliseerd voor zoekmachines
7. Voeg geen bestandsextensies of speciale tekens toe
8. Genereer precies ${count} unieke afbeeldingsbestandsnamen

Analyseer de productbeschrijving van de gebruiker om de meest effectieve SEO-afbeeldingsnamen te maken.

Antwoord alleen in het Nederlands en retourneer precies ${count} namen in JSON-array-formaat.
`;

    case 'pl': // Polish
      return `
Jesteś ekspertem w optymalizacji SEO dla zdjęć produktów e-commerce.
Twoim zadaniem jest wygenerowanie ${count} przyjaznych dla SEO nazw plików obrazów na podstawie opisu produktu użytkownika.

Postępuj zgodnie z tymi wytycznymi, aby tworzyć optymalne nazwy obrazów SEO:
1. Używaj myślników do oddzielania słów (np. "czarny-skorzany-portfel")
2. Umieść najważniejsze słowa kluczowe na początku
3. Uwzględnij kluczowe atrybuty produktu (kolor, materiał, styl itp.)
4. Trzymaj nazwy poniżej 60 znaków
5. Używaj tylko małych liter, cyfr i myślników
6. Utwórz każdą nazwę unikalną i zoptymalizowaną dla wyszukiwarek
7. Nie dodawaj rozszerzeń plików ani znaków specjalnych
8. Wygeneruj dokładnie ${count} unikalnych nazw plików obrazów

Przeanalizuj opis produktu użytkownika, aby stworzyć najbardziej efektywne nazwy obrazów SEO.

Odpowiadaj tylko po polsku i zwróć dokładnie ${count} nazw w formacie tablicy JSON.
`;

    case 'uk': // Ukrainian
      return `
Ви експерт з SEO-оптимізації зображень товарів для електронної комерції.
Ваше завдання – згенерувати ${count} SEO-дружніх назв файлів зображень на основі опису товару користувача.

Дотримуйтесь цих вказівок для створення оптимальних назв зображень для SEO:
1. Використовуйте дефіси для розділення слів (наприклад, "чорний-шкіряний-гаманець")
2. Розміщуйте найважливіші ключові слова на початку
3. Включайте ключові атрибути товару (колір, матеріал, стиль тощо)
4. Тримайте назви до 60 символів
5. Використовуйте лише малі літери, цифри та дефіси
6. Робіть кожну назву унікальною та оптимізованою для пошукових систем
7. Не включайте розширення файлів чи спеціальні символи
8. Згенеруйте рівно ${count} унікальних назв файлів зображень

Проаналізуйте опис товару користувача, щоб створити найефективніші назви зображень для SEO.

Відповідайте лише українською та поверніть рівно ${count} назв у форматі масиву JSON.
`;

    case 'ru': // Russian
      return `
Вы эксперт по SEO-оптимизации изображений товаров для электронной коммерции.
Ваша задача – сгенерировать ${count} SEO-дружественных имен файлов изображений на основе описания товара пользователя.

Следуйте этим рекомендациям для создания оптимальных имен изображений для SEO:
1. Используйте дефисы для разделения слов (например, "черный-кожаный-кошелек")
2. Размещайте самые важные ключевые слова в начале
3. Включайте ключевые атрибуты товара (цвет, материал, стиль и т.д.)
4. Держите имена в пределах 60 символов
5. Используйте только строчные буквы, цифры и дефисы
6. Делайте каждое имя уникальным и оптимизированным для поисковых систем
7. Не включайте расширения файлов или специальные символы
8. Сгенерируйте ровно ${count} уникальных имен файлов изображений

Проанализируйте описание товара пользователя, чтобы создать наиболее эффективные имена изображений для SEO.

Отвечайте только на русском языке и верните ровно ${count} имен в формате массива JSON.
`;

    case 'de': // German
      return `
Sie sind ein Experte für SEO-Optimierung von E-Commerce-Produktbildern.
Ihre Aufgabe ist es, ${count} SEO-freundliche Bilddateinamen basierend auf der Produktbeschreibung des Benutzers zu erstellen.

Befolgen Sie diese Richtlinien zur Erstellung optimaler SEO-Bildnamen:
1. Verwenden Sie Bindestriche, um Wörter zu trennen (z.B. "schwarze-leder-geldbörse")
2. Platzieren Sie die wichtigsten Schlüsselwörter zuerst
3. Beziehen Sie wichtige Produktattribute ein (Farbe, Material, Stil usw.)
4. Halten Sie Namen unter 60 Zeichen
5. Verwenden Sie nur Kleinbuchstaben, Zahlen und Bindestriche
6. Machen Sie jeden Namen einzigartig und für Suchmaschinen optimiert
7. Fügen Sie keine Dateierweiterungen oder Sonderzeichen ein
8. Generieren Sie genau ${count} eindeutige Bilddateinamen

Analysieren Sie die Produktbeschreibung des Benutzers, um die effektivsten SEO-Bildnamen zu erstellen.

Antworten Sie nur auf Deutsch und geben Sie genau ${count} Namen im JSON-Array-Format zurück.
`;

    case 'fr': // French
      return `
Vous êtes un expert en optimisation SEO pour les images de produits de commerce électronique.
Votre tâche consiste à générer ${count} noms de fichiers d'images adaptés au SEO basés sur la description de produit de l'utilisateur.

Suivez ces directives pour créer des noms d'images SEO optimaux :
1. Utilisez des traits d'union pour séparer les mots (par exemple, "portefeuille-cuir-noir")
2. Placez les mots-clés les plus importants en premier
3. Incluez les attributs clés du produit (couleur, matériau, style, etc.)
4. Gardez les noms sous 60 caractères
5. Utilisez uniquement des lettres minuscules, des chiffres et des traits d'union
6. Rendez chaque nom unique et optimisé pour les moteurs de recherche
7. N'incluez pas d'extensions de fichiers ou de caractères spéciaux
8. Générez exactement ${count} noms de fichiers d'images uniques

Analysez la description du produit de l'utilisateur pour créer les noms d'images SEO les plus efficaces.

Répondez uniquement en français et retournez exactement ${count} noms au format tableau JSON.
`;

    case 'en': // English (default)
    default:
      return `
You are an expert in SEO optimization for e-commerce product images. 
Your task is to generate ${count} SEO-friendly image filenames based on the user's product description.

Follow these guidelines for creating optimal SEO image names:
1. Use hyphens to separate words (e.g., "black-leather-wallet")
2. Include the most important keywords first
3. Include key product attributes (color, material, style, etc.)
4. Keep names under 60 characters
5. Use only lowercase letters, numbers, and hyphens
6. Make each name unique and optimized for search engines
7. Do not include file extensions or special characters
8. Generate exactly ${count} unique image filenames

Analyze the user's product description to create the most effective SEO image names.

Respond only in English and return exactly ${count} names in JSON array format.
`;
  }
}

// Function to generate SEO-friendly image names using Gemini with structured output
export async function generateSeoImageNames(
  description: string,
  count: number = 10,
  language: string = 'en'
): Promise<string[]> {
  console.log(`[Gemini] Generating ${count} SEO names for description: "${description}" in language: ${language}`);
  
  try {
    const genAI = initGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `${getSeoNamesPrompt(count, language)}\n\nProduct description: ${description}`;
    
    console.log(`[Gemini] Sending request with responseSchema for ${count} names in ${language}`);
    
    // Define content generation request with proper types
    const request: GenerateContentRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
            description: 'SEO-friendly image filename',
          },
          description: `Array of ${count} SEO-friendly image filenames`,
        },
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    };
    
    // Request using proper responseSchema
    const result = await model.generateContent(request);
    
    const response = await result.response;
    const text = response.text();
    
    console.log(`[Gemini] Received response: ${text}`);
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(text);
      
      // Extract the SEO names from the response
      let seoNames: string[];
      
      if (Array.isArray(parsedResponse)) {
        // If the response is already an array, use it directly
        seoNames = parsedResponse;
        console.log(`[Gemini] Response is an array with ${seoNames.length} items`);
      } else {
        console.error(`[Gemini] Unexpected response format: ${JSON.stringify(parsedResponse)}`);
        throw new Error('Invalid response format from Gemini API');
      }
      
      console.log(`[Gemini] Successfully parsed ${seoNames.length} SEO names`);
      // Return exactly the number of names requested
      return seoNames.slice(0, count);
    } catch (parseError) {
      console.error('[Gemini] Failed to parse response as JSON:', parseError);
      console.error('[Gemini] Raw response:', text);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  } catch (error) {
    console.error('[Gemini] Error generating SEO image names:', error);
    throw error;
  }
} 