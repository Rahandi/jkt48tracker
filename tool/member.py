from bs4 import BeautifulSoup
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.support import ui
import undetected_chromedriver as uc
load_dotenv()

def wait_member_detail(driver):
  return driver.find_element("class name", "entry-mypage__item") is not None

base_url = "https://jkt48.com"
member_list_url = f"{base_url}/member/list?lang=id"
chrome = uc.Chrome()
chrome.get(member_list_url)
member_list_soup = BeautifulSoup(chrome.page_source, "lxml")
members = member_list_soup.find_all("div", class_="entry-member")
for member in members:
  id = member.find("a")["href"].split("/")[-1].split("?")[0]
  link = member.find("a")["href"]
  name = member.find("img")["alt"]
  image_url = member.find("img")["src"]
  
  # member detail
  member_detail_url = f"{base_url}{link}"
  chrome.get(member_detail_url)
  detail_soup = BeautifulSoup(chrome.page_source, "lxml")
  wait = ui.WebDriverWait(chrome, 10)
  wait.until(wait_member_detail)
  entries = detail_soup.find_all("div", class_="entry-mypage__item")
  for entry in entries:
    subject = entry.find("div", class_=" entry-mypage__item--subject").text.strip()
    content = entry.find("div", class_=" entry-mypage__item--content").text.strip()
    if subject == "Tanggal Lahir": birthdate = content
    if subject == "Golongan Darah": blood_type = content
    if subject == "Tinggi Badan": height = content
    if subject == "Nama Panggilan": nickname = content
  print({
    "id": id,
    "name": name,
    "link": link,
    "image_url": image_url,
    "birthdate": birthdate,
    "blood_type": blood_type,
    "height": height,
    "nickname": nickname
  })
