from langchain.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
from rich import print
import os
from dotenv import load_dotenv
import tavily

load_dotenv()

def build_search_tool(api_key: str):
    """
    Create a web_search tool using the provided Tavily API key.
    Called per-request from main.py so each user's key is used.
    """
    from tavily import TavilyClient
    from langchain.tools import tool
    from langchain_community.tools.tavily_search import TavilySearchResults
    from langchain_community.utilities.tavily_search import TavilySearchAPIWrapper

    # 1. Creating the thread-safe API wrapper using the user's specific key
    search_wrapper = TavilySearchAPIWrapper(tavily_api_key=api_key)
    
    # 2. Passing the wrapper instance directly into the LangChain search tool
    tavily_tool = TavilySearchResults(api_wrapper=search_wrapper, max_results=3)
    
    # 3. Returning the tool so main.py can hand it over to your search agent
    return tavily_tool
 

@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text context from a given URL for deeper reading."""
    try:
        response = requests.get(url, timeout=8, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(response.text, 'html.parser')
        for tag in soup(["script", "style", 'nav', 'footer']):
            tag.decompose()
        return soup.get_text(separator="", strip = True)[:3000]
    except Exception as e:
        return f"Error scraping URL: {str(e)}"
    