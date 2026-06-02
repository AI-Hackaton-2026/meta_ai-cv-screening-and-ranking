"""
Generates sample CV PDF files for MetaHire demo purposes.
Run: python samples/create_sample_cvs.py
Requires reportlab: pip install reportlab (or uv run --with reportlab python ...)
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

OUT_DIR = Path(__file__).parent / "cvs"
OUT_DIR.mkdir(exist_ok=True)

VIOLET = colors.HexColor("#726BFF")
INK = colors.HexColor("#282C34")

CANDIDATES = [
    {
        "filename": "sarah_chen_fullstack.pdf",
        "content": """
SARAH CHEN
sarah.chen@email.com | linkedin.com/in/sarahchen | GitHub: github.com/sarahchen

SUMMARY
Senior Full-Stack Engineer with 7 years of experience building scalable web applications.
Strong expertise in React, TypeScript, Node.js, and cloud infrastructure on AWS.
Led multiple cross-functional teams and delivered high-impact products.

EXPERIENCE

Senior Software Engineer — TechCorp Inc. (2021–Present)
- Led development of a React + TypeScript SPA serving 500K daily users
- Designed and implemented RESTful microservices in Node.js (Express) deployed on AWS ECS
- Reduced deployment time by 60% by implementing GitHub Actions CI/CD pipelines
- Mentored a team of 4 junior engineers

Full-Stack Engineer — StartupXYZ (2018–2021)
- Built full-stack features across React frontend and Python/Django backend
- Integrated third-party APIs (Stripe, Twilio) and managed PostgreSQL schemas
- Containerised services with Docker and deployed to GCP Kubernetes

Junior Developer — WebAgency (2017–2018)
- Developed client websites using React and REST APIs

SKILLS
- Frontend: React, TypeScript, Redux, Tailwind CSS, Next.js
- Backend: Node.js, Python, Django, FastAPI
- Cloud: AWS (EC2, S3, Lambda, RDS), GCP, Docker, Kubernetes
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Git, GitHub Actions, Terraform, Jest, Cypress

EDUCATION
BSc Computer Science — University of Edinburgh (2013–2017), First Class Honours

OPEN SOURCE
- Contributor to React Query library (30+ merged PRs)
- Author of `react-table-toolkit` (1.2k GitHub stars)
""".strip(),
    },
    {
        "filename": "marcos_oliveira_backend.pdf",
        "content": """
MARCOS OLIVEIRA
marcos.oliveira@email.com | São Paulo, Brazil | linkedin.com/in/marcosoliveira

SUMMARY
Backend engineer with 6 years of experience specialising in Python microservices and API design.
Solid experience with AWS and PostgreSQL. Limited frontend experience.

EXPERIENCE

Backend Engineer — Fintech Solutions (2020–Present)
- Developed Python/FastAPI microservices handling 1M+ daily transactions
- Designed PostgreSQL schemas and optimised slow queries (10x improvement)
- Implemented async task queues with Celery and Redis
- Deployed services on AWS using ECS and RDS

Python Developer — DataPlatform Co. (2018–2020)
- Built ETL pipelines using Python and Apache Airflow
- Developed internal REST APIs consumed by frontend teams
- Managed AWS S3 data lake infrastructure

Junior Developer — WebShop Ltd. (2017–2018)
- Maintained legacy PHP application and migrated to Python

SKILLS
- Backend: Python, FastAPI, Django, Flask, Celery
- Databases: PostgreSQL, MySQL, Redis
- Cloud: AWS (ECS, RDS, S3, Lambda)
- Tools: Docker, Git, GitHub Actions, pytest
- Frontend: Basic HTML/CSS, minimal React experience

EDUCATION
BSc Information Systems — University of São Paulo (2013–2017)
""".strip(),
    },
    {
        "filename": "priya_sharma_aiml.pdf",
        "content": """
PRIYA SHARMA, PhD
priya.sharma@email.com | London, UK | linkedin.com/in/priyasharma

SUMMARY
AI/ML Engineer with a PhD in Machine Learning and 4 years industry experience.
Specialises in NLP, LLMs, and production ML systems. Published researcher with
experience deploying models at scale.

EXPERIENCE

Senior ML Engineer — AI Startup (2022–Present)
- Led development of a production RAG system using LangChain + Pinecone for 50K users
- Fine-tuned LLaMA 2 for domain-specific Q&A; 35% accuracy improvement over baseline
- Implemented MLOps pipeline using MLflow + AWS SageMaker
- Worked extensively with OpenAI and Anthropic APIs for prompt engineering

ML Engineer — Tech Giant (2020–2022)
- Built and deployed NLP models for content moderation (BERT-based classifiers)
- Managed data pipelines using Apache Airflow and PySpark
- Designed vector search infrastructure using FAISS and Elasticsearch

Research Assistant — University College London (2016–2020)
- PhD thesis: "Efficient Training of Large Language Models for Low-Resource Languages"
- Published 3 peer-reviewed papers at NeurIPS and ACL

SKILLS
- ML: PyTorch, TensorFlow, HuggingFace Transformers, scikit-learn
- LLM/AI: OpenAI API, Anthropic API, LangChain, LlamaIndex, Pinecone, FAISS
- MLOps: MLflow, W&B, AWS SageMaker, Docker
- Data: Apache Spark, Airflow, dbt, Pandas
- Languages: Python (expert), R, SQL

EDUCATION
PhD Machine Learning — University College London (2016–2020)
MSc Data Science — Imperial College London (2015–2016)
BSc Computer Science — IIT Delhi (2011–2015), Gold Medal
""".strip(),
    },
    {
        "filename": "james_okafor_junior.pdf",
        "content": """
JAMES OKAFOR
james.okafor@email.com | Lagos, Nigeria

SUMMARY
Recent Computer Science graduate with 1 year of internship experience.
Enthusiastic about web development and eager to learn.

EXPERIENCE

Frontend Intern — LocalStartup (2023–2024)
- Built React components for an e-commerce website
- Fixed CSS bugs and improved mobile responsiveness
- Participated in daily standups and sprint reviews

Freelance Developer (2022–2023)
- Built 3 small business websites using HTML, CSS, and JavaScript
- Used WordPress for content management

SKILLS
- HTML, CSS, JavaScript (basic)
- React (beginner, completed online course)
- Git basics
- No cloud experience

EDUCATION
BSc Computer Science — University of Lagos (2019–2023), Second Class Upper
""".strip(),
    },
    {
        "filename": "elena_rodriguez_fullstack.pdf",
        "content": """
ELENA RODRIGUEZ
elena.rodriguez@email.com | Madrid, Spain | github.com/elenarodriguez

SUMMARY
Full-Stack Engineer with 5 years of experience in React and Node.js.
Strong background in TypeScript, cloud deployments, and team leadership.
Passionate about clean code and developer experience.

EXPERIENCE

Full-Stack Engineer — SaaS Company (2021–Present)
- Built React (TypeScript) dashboard used by 200K monthly active users
- Developed Node.js/Express APIs and integrated with PostgreSQL and MongoDB
- Deployed on AWS using ECS, RDS, and CloudFront CDN
- Introduced ESLint + Prettier standards, improving code consistency across 12-person team
- Mentored 2 junior developers

Software Engineer — Consulting Firm (2019–2021)
- Delivered 4 client projects using React, Node.js, and AWS
- Implemented CI/CD pipelines with GitHub Actions
- Containerised applications with Docker

Junior Developer — WebDev Agency (2018–2019)
- Built responsive UIs with React and managed REST API integrations

SKILLS
- Frontend: React, TypeScript, Redux Toolkit, Next.js, Tailwind CSS
- Backend: Node.js, Express, REST APIs, GraphQL
- Cloud: AWS (ECS, S3, Lambda, CloudFront, RDS)
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Docker, Kubernetes (basic), GitHub Actions, Jest, Playwright

EDUCATION
BSc Computer Engineering — Universidad Politécnica de Madrid (2014–2018)

OPEN SOURCE
- `ts-validator` library — type-safe validation for TypeScript (850 GitHub stars)
""".strip(),
    },
    {
        "filename": "alex_kim_devops.pdf",
        "content": """
ALEX KIM
alex.kim@email.com | Seoul, South Korea

SUMMARY
DevOps/Platform Engineer with 8 years of experience. Expert in Kubernetes, Terraform,
and CI/CD. Strong cloud background but limited application development experience.

EXPERIENCE

Staff Platform Engineer — BigCorp (2020–Present)
- Managed Kubernetes clusters (500+ nodes) on AWS EKS
- Led Terraform infrastructure-as-code migration saving $300K/year
- Built internal developer platform with ArgoCD and GitHub Actions
- Zero experience with React or frontend development

DevOps Engineer — CloudCo (2016–2020)
- Maintained Jenkins CI/CD pipelines for 50+ microservices
- Managed AWS infrastructure across 3 regions

SKILLS
- DevOps: Kubernetes, Terraform, Helm, ArgoCD, Jenkins, GitHub Actions
- Cloud: AWS (EKS, EC2, RDS, S3, Lambda), GCP
- Languages: Bash, Python (scripting only), Go (basic)
- No React/Node.js experience

EDUCATION
BSc Computer Science — Korea University (2012–2016)
""".strip(),
    },
    {
        "filename": "nina_petrov_ml_junior.pdf",
        "content": """
NINA PETROV
nina.petrov@email.com | Berlin, Germany

SUMMARY
Machine Learning Engineer with 2 years of experience. Strong Python skills,
experience with PyTorch and basic NLP models. Working toward production ML expertise.

EXPERIENCE

Junior ML Engineer — AI Scale-up (2023–Present)
- Trained and evaluated classification models using PyTorch
- Worked with Hugging Face transformers for sentiment analysis
- Basic experience with MLflow for experiment tracking
- No production deployment experience yet

Data Science Intern — Analytics Firm (2022–2023)
- Performed EDA and feature engineering on tabular datasets
- Built predictive models using scikit-learn
- Created data visualisations with matplotlib and seaborn

SKILLS
- ML: PyTorch, scikit-learn, HuggingFace (basic), Pandas, NumPy
- Languages: Python, SQL (basic)
- Tools: MLflow (basic), Jupyter, Git
- No LLM API or MLOps production experience

EDUCATION
MSc Data Science — TU Berlin (2021–2023)
BSc Mathematics — Humboldt University (2017–2021)
""".strip(),
    },
    {
        "filename": "david_walsh_pm_background.pdf",
        "content": """
DAVID WALSH
david.walsh@email.com | Dublin, Ireland

SUMMARY
Technical Product Manager transitioning into engineering with 3 years of PM experience
and 1 year of self-taught coding. Limited but growing technical depth.

EXPERIENCE

Product Manager — SaaS Platform (2021–2024)
- Managed product roadmap for a B2B SaaS platform (React frontend, Node.js backend)
- Wrote technical specifications and worked daily with engineering teams
- No hands-on coding in professional environment

Self-Taught Developer (2024–Present)
- Completed freeCodeCamp Full-Stack curriculum
- Built 2 personal projects in React and Node.js (deployed on Heroku)
- Basic familiarity with REST APIs and Git

SKILLS
- React (self-taught, 1 year), Node.js (basic), HTML/CSS
- No cloud or database production experience
- Strong written communication and stakeholder management

EDUCATION
BA Business & Computing — University College Dublin (2017–2021)
""".strip(),
    },
]


def create_pdf(filename: str, content: str) -> None:
    path = OUT_DIR / filename
    doc = SimpleDocTemplate(str(path), pagesize=A4,
                             rightMargin=2*cm, leftMargin=2*cm,
                             topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["Normal"],
                          textColor=INK, fontSize=10, leading=14)
    story = []
    for line in content.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 6))
        elif line.isupper() and len(line) < 60:
            story.append(Paragraph(f"<b>{line}</b>", body))
        else:
            story.append(Paragraph(line, body))
    doc.build(story)
    print(f"Created: {path}")


if __name__ == "__main__":
    for cand in CANDIDATES:
        create_pdf(cand["filename"], cand["content"])
    print(f"\nAll sample CVs written to {OUT_DIR}")
