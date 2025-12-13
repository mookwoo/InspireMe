# 🌟 InspireMe – Motivational Quote Generator

**InspireMe** is a simple, responsive web application that showcases motivational, humorous, philosophical, and educational quotes. Built to deliver instant inspiration for every mood and moment.

👉 **Live Demo:** [https://inspireme-by-vera.netlify.app/](https://inspireme-by-vera.netlify.app/)

---

## Features
- **Categorized Quotes** – Filter quotes by themes like Motivation, Humor, and Philosophy  
- **Dynamic Quote Generation** – Get a new quote with a single click  
- **User-Friendly Interface** – Built with simplicity and clarity in mind  
- **Regular Updates** – Expandable with more categories or future API integration

---

## Tech Stack
- **HTML5** – Semantic structure  
- **CSS3** – Custom styling and layout  
- **JavaScript (Vanilla)** – DOM manipulation and quote logic
- **Supabase** – Backend database and authentication
- **Hugging Face API** – AI-powered automatic tag suggestions  
- **Netlify** – Deployed for fast, free web hosting  

---

## AI-Powered Tag Suggestions

InspireMe uses Hugging Face's zero-shot classification model to automatically suggest relevant tags for quotes. This helps maintain consistent categorization across the database.

### Setup AI Tagging

1. Get a free API token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Add it to your `.env` file:
   ```
   VITE_HUGGINGFACE_TOKEN=your_token_here
   ```
3. In the admin panel, click "Auto-tag with AI" when adding quotes

The AI analyzes the quote text and suggests tags like motivation, wisdom, love, courage, etc.  

---

## My Role & Learnings

I built InspireMe from scratch as a way to practice:
- DOM manipulation using arrays and event handling  
- Building a component-style structure without a frontend framework  
- Deploying a static site and iterating on design and function

I especially loved how quickly I could test and improve the quote logic and UI. In future versions, I plan to:
- Save the array quotes to a database.  
- Implement a favourite quotes feature  
- Implement a social searching button
- Implement a form that allows users to submit quotes.

---

## How to Use
1. Visit the live site  
2. Click "New Quote" to refresh the message  
3. Filter quotes by category to suit your mood  

---

## Project Links
- **Live Site:** [inspireme-by-vera.netlify.app](https://inspireme-by-vera.netlify.app/)
- **Code Repository:** [github.com/chiomavera/InspireMe](https://github.com/chiomavera/InspireMe)

---

## Feedback or Collaboration?
Feel free to [connect on LinkedIn](https://www.linkedin.com/in/chioma-vera-nkanmuo/) or open an issue if you'd like to contribute, suggest quotes, or collaborate on future versions.


