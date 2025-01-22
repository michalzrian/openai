const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 5000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());
app.use(cors());

//func of reverse the text (hebrew...)
const fixHebrewText = (text) => {
    if (/[\u0590-\u05FF]/.test(text)) {
        return text.split('').reverse().join('');  
    }
    return text; 
};
const scrapeWebsite = async (url) => {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const content = $('body').text();

        return content;
    } catch (error) {
        console.error('Error scraping website:', error.message);
        return null; 
    }
};

app.post('/generate-page', async (req, res) => {
    const { prompt, url } = req.body;
//retrieve datas from the link
    const websiteContent = await scrapeWebsite(url);
    if (!websiteContent) {
        return res.status(500).send({ message: 'Error scraping the website' });
    }

    const enhancedPrompt = `הנה תוכן מהאתר: ${websiteContent} עכשיו, השאלה שלי היא: ${prompt}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: enhancedPrompt }],
        });

        console.log("question " , prompt)
        let generatedAnswer = response.choices[0].message.content.trim();

        //check and revers the text...
        generatedAnswer = fixHebrewText(generatedAnswer);
        console.log("answer " , generatedAnswer);
        res.json({ answer: generatedAnswer });
    } catch (error) {
        console.error('Error during API request:', error.message);
        res.status(500).send({ message: 'Error generating response from OpenAI', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

