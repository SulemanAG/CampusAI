# CampusAI --- Intelligent University Communication & Student Support Platform

CampusAI is an AI-powered university communication and student-support
platform designed to make official academic and administrative
information easier to access. Students can ask questions in natural
language, receive answers grounded in verified university documents, and
raise support tickets when a question cannot be answered reliably.
University departments can manage documents, review tickets, and track
resolution progress through structured workflows.

> **Project status:** This README describes the project architecture and
> intended workflow documented for CampusAI. Replace or verify
> technology names, setup commands, environment variables, and
> deployment details against the actual codebase before publishing.

## Table of Contents

-   [Problem Statement](#problem-statement)
-   [Proposed Solution](#proposed-solution)
-   [Key Features](#key-features)
-   [System Architecture](#system-architecture)
-   [How the Query Pipeline Works](#how-the-query-pipeline-works)
-   [RAG Knowledge Pipeline](#rag-knowledge-pipeline)
-   [Support Ticket Lifecycle](#support-ticket-lifecycle)
-   [Security and Access Control](#security-and-access-control)
-   [Data and Infrastructure
    Components](#data-and-infrastructure-components)
-   [Evaluation Metrics](#evaluation-metrics)
-   [Deployment Considerations](#deployment-considerations)
-   [Limitations and Reliability
    Considerations](#limitations-and-reliability-considerations)
-   [Team](#team)
-   [SDG Alignment](#sdg-alignment)

## Problem Statement

Universities publish important information---such as examination
schedules, admission procedures, fee details, scholarships, regulations,
and official circulars---across multiple channels. This fragmentation
can cause students to miss deadlines, create repetitive queries for
administrative staff, and make it difficult to identify the latest
authoritative information.

CampusAI proposes a centralized platform that combines document-grounded
AI assistance with a structured human support workflow.

## Proposed Solution

CampusAI uses department-specific AI agents and a verified institutional
knowledge base to respond to student questions. The query pipeline
checks for a suitable cached response before invoking
Retrieval-Augmented Generation (RAG). If the system cannot find enough
reliable evidence to answer a question, it can create a support ticket
and route it to the relevant university department.

The system is designed around three principles:

1.  **Grounded information:** Answers should be based on verified
    university sources.
2.  **Safe fallback:** Unresolved or low-confidence queries should be
    escalated instead of answered with unsupported claims.
3.  **Human accountability:** Department staff review and resolve
    tickets, and students can confirm resolution before closure.

## Key Features

-   **Natural-language student support** for academic and administrative
    questions.
-   **Department-specific agents** for domains such as Admissions,
    Academics, Examinations, and Finance.
-   **Cache-Augmented Generation (CAG)** to reuse suitable answers to
    repeated or semantically similar questions.
-   **Retrieval-Augmented Generation (RAG)** to retrieve relevant
    passages from official university documents and provide context to a
    language model.
-   **Semantic similarity and reranking** to help identify relevant
    document chunks and related questions.
-   **Automatic support-ticket creation** for unresolved or
    insufficiently supported queries.
-   **Duplicate-ticket detection and clustering** to help departments
    identify related issues.
-   **Ticket lifecycle tracking** with Open, In Progress, Resolved, and
    Closed states.
-   **Department dashboards** for document management, ticket review,
    and resolution workflows.
-   **Student resolution confirmation** to support transparent closure.
-   **Role-based access control and tenant-isolation design** for
    student, staff, administrator, and multi-university scenarios.

## System Architecture

CampusAI is organized as a layered system. The diagram below is a
conceptual view of the architecture described in the project document;
it does not imply that every component is deployed as a separate
microservice.

``` text
┌──────────────────────────────────────────────────────────────┐
│                         Access Layer                         │
│   Student Portal | University Admin Portal | Agent Portal    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                  API Gateway / Security                      │
│ Authentication | RBAC | Department Mapping | Tenant Isolation│
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                  Query Intelligence Pipeline                 │
│ Query Understanding → Agent/Department Routing               │
│                  → CAG Cache Check                           │
│                  → RAG Retrieval on Cache Miss               │
│                  → Confidence / Evidence Evaluation          │
└──────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
┌───────────▼────────────┐            ┌───────────▼────────────┐
│ Verified Knowledge Base│            │ Ticketing and Support  │
│ Documents, Chunks,     │            │ Create, Assign, Track,  │
│ Embeddings, Metadata   │            │ Resolve, Confirm Close  │
└────────────────────────┘            └───────────┬────────────┘
                                                  │
                                      ┌───────────▼────────────┐
                                      │ Department Operations  │
                                      │ Review, Resolution,     │
                                      │ Analytics and Feedback  │
                                      └────────────────────────┘

Supporting infrastructure:
Primary Database | Vector Database | Redis Cache | LLM Service |
Embedding Service | Clustering Models | Monitoring and Logging
```

## How the Query Pipeline Works

1.  **Receive a question:** A student submits a natural-language query
    through the student portal.
2.  **Understand and route the query:** The system identifies the likely
    intent and relevant department domain.
3.  **Check CAG:** The system checks for a suitable cached response
    using the configured matching strategy.
4.  **Invoke RAG if needed:** On a cache miss, the system retrieves
    relevant chunks from the department's verified knowledge base.
5.  **Rank the evidence:** Retrieved chunks can be ranked and reranked
    to prioritize useful context.
6.  **Generate a grounded response:** The language model receives the
    query and selected evidence to formulate an answer.
7.  **Evaluate whether the question is answerable:** If evidence is
    insufficient or the query remains unresolved, the system follows its
    fallback path.
8.  **Escalate when needed:** A support ticket is created and routed to
    the appropriate department.
9.  **Close the loop:** Staff resolve the issue, the student is
    notified, and the student confirms resolution before closure.

## RAG Knowledge Pipeline

RAG combines document retrieval with language generation. It helps the
model answer using university-specific information that may not be part
of the model's training data.

### Knowledge preparation

1.  Authorized university staff upload official PDFs, notices,
    circulars, and regulations.
2.  The ingestion process extracts document text and relevant metadata.
3.  Text is divided into chunks suitable for retrieval.
4.  An embedding model converts each chunk into a numerical vector.
5.  Chunks, embeddings, and metadata are indexed in the knowledge base.

### Query-time retrieval

1.  Convert the student's query into an embedding using a compatible
    embedding model.
2.  Search the vector index for semantically similar chunks, applying
    department or tenant filters where required.
3.  Retrieve candidate chunks (the project design describes a top-10
    candidate stage).
4.  Rank or rerank candidates to prioritize relevant evidence.
5.  Construct the model context using the selected passages and source
    information.
6.  Generate an answer grounded in the supplied context.
7.  Return the answer when sufficient evidence is available; otherwise,
    use the support-ticket fallback.

**Reliability note:** A similarity score is not proof that an answer is
factually correct. Source freshness, conflicting documents, retrieval
quality, and whether the generated answer is supported by the retrieved
passages must also be considered. The exact embedding model, chunk
configuration, vector database, reranker, and confidence policy should
be documented from the implementation.

## Support Ticket Lifecycle

CampusAI provides a structured workflow for queries that cannot be
resolved reliably by the AI pipeline.

``` text
Open → In Progress → Resolved → Closed
```

-   **Open:** The issue has been created and is awaiting review or
    assignment.
-   **In Progress:** The responsible department is working on the issue.
-   **Resolved:** The department has provided a resolution.
-   **Closed:** The student has confirmed the resolution and the
    workflow is complete.

The backend should validate allowed state transitions, enforce ownership
and role permissions, and retain appropriate history for traceability.
Similar tickets may be identified or grouped to reduce duplicated
effort.

## Security and Access Control

The documented architecture includes authentication, role-based access
control, email-domain mapping, and tenant isolation.

Security considerations for an implementation include:

-   Authenticate users before exposing protected data.
-   Enforce authorization on the backend, not only in the frontend.
-   Check that students can access only their own conversations and
    tickets.
-   Restrict document upload and ticket-management actions to authorized
    roles.
-   Scope document retrieval and cached answers to the correct
    department and university.
-   Keep credentials and API keys in environment variables or a secrets
    manager.
-   Avoid logging passwords, access tokens, or unnecessary personal
    information.
-   Version official documents and invalidate stale cached responses
    when their contents change.

These are security requirements and design recommendations; the exact
controls in the running application should be verified against its code
and configuration.

## Data and Infrastructure Components

The project architecture identifies the following logical components:

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Primary database                    Structured application data such as
                                      users, departments, conversations,
                                      and tickets

  Vector database                     Embedding index and searchable
                                      document chunks

  Redis cache                         Fast access to reusable answers or
                                      cache-related data

  Embedding service                   Converts document chunks and user
                                      queries into vectors

  LLM service                         Generates responses using the
                                      retrieved context

  Clustering models                   Identify semantically related
                                      questions or tickets

  Monitoring and logging              Help diagnose errors and measure
                                      reliability and performance
  -----------------------------------------------------------------------

The specific products, schemas, model names, API routes, and deployment
configuration should be added from the actual repository. This README
intentionally does not assume unverified implementation details.

## Evaluation Metrics

The project document reports the following evaluation values:

  Metric                                  Reported value
  ------------------------------------- ----------------
  Hallucination Resistance Rate (HRR)               0.87
  Computational Load Reduction (CLR)                0.94
  Contextual Relevance Rate (CRR)                  90.8%
  Retrieval Noise Ratio                             0.18
  Average Response Latency                   2.7 seconds

These values are reproduced from the project document and should not be
interpreted as independently verified benchmarks. Before presenting them
as experimental results, document the dataset, sample size, metric
definitions, baseline, hardware, model configuration, and measurement
procedure. In particular, clarify whether response latency is mean or
median and which pipeline stages it includes.

Useful additional evaluation measures include retrieval Recall@k and
nDCG, answer groundedness, source citation accuracy, ticket-routing
accuracy, cache hit rate, p50/p95 latency, and end-to-end failure rate.

## Deployment Considerations

The project document identifies cloud-hosting options such as AWS,
Vercel, and Render, and discusses support for web and Android access.
Actual deployment instructions depend on the repository and
infrastructure configuration.

Before deployment, document:

-   Required runtime and dependency versions.
-   Environment variables and secret-management requirements.
-   Database and vector-index provisioning.
-   Redis and AI-service connectivity.
-   Document storage and indexing procedures.
-   Authentication and authorization configuration.
-   Health checks, logs, backups, and monitoring.
-   CORS, TLS, rate limiting, and request-size limits.
-   Migration and rollback procedures.

Do not commit `.env` files, credentials, private university documents,
or student data to version control.

## Limitations and Reliability Considerations

-   RAG reduces reliance on unsupported model knowledge but does not
    guarantee zero hallucinations.
-   Outdated or incorrectly processed documents can produce incorrect
    answers.
-   Similarity thresholds require evaluation on representative
    university questions.
-   Cached answers must be invalidated or versioned when official
    information changes.
-   Multi-university deployments require strong tenant isolation across
    databases, retrieval, cache keys, and authorization checks.
-   Ticket creation and status changes should be protected against
    unauthorized access and duplicate requests.
-   Performance and scalability claims should be supported by repeatable
    measurements.

## Team

**Institution:** School of Computer Science with Artificial Intelligence
Engineering, KLE Technological University, Hubballi, India.

-   Md Sadiq Lakkundi
-   Md. Abdul Raqeeb
-   Owais Aminabhavi
-   Suleman Agasimani

## SDG Alignment

-   **SDG 4 --- Quality Education:** Improves access to academic and
    administrative information and supports a more student-centric
    educational experience.
-   **SDG 16 --- Peace, Justice, and Strong Institutions:** Supports
    transparent grievance handling, traceable support workflows, and
    accountable institutional processes.

------------------------------------------------------------------------

## Contributing

For team contributions, use the repository's agreed branching, review,
and testing workflow. Add verified setup instructions, architecture
decisions, API documentation, and tests as the implementation evolves.

## License

Add the license selected by the project team before public distribution.
