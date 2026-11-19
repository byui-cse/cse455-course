---
title: Mini Lesson: Retrieval-Augmented Generation
body-class: index-page
---

# Contextual Retrieval: Solution Walkthrough

In this walkthrough you will run and examine a completed local RAG pipeline inspired by Anthropic's [Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval). You will split a small document collection, store two sets of embeddings in PostgreSQL, compare semantic and keyword search, add context, combine rankings, rerank results, and generate an answer from retrieved evidence.

You do not need to write Python to complete the walkthrough. Each `lab.py` command selects the completed functions in `solution.py` with `--impl solution`. Read those functions and the prompts as you go, and record your observations. No API key or GPU is required; all inference and database operations run locally after the initial downloads.

**Estimated time:** 60–90 minutes plus downloads and model inference. CPU inference, particularly reranking, may take longer. The guides and equipment in this lab are fictional.

## Learning objectives

- Explain why a chunk can lose useful context when it is separated from its source document.
- Compare semantic search with BM25 keyword search and combine them using reciprocal rank fusion.
- Explain how chunk-specific context changes both embedding and BM25 retrieval.
- Observe how reranking and the number of returned chunks affect retrieval and latency.
- Evaluate retrieval separately from answer generation and check generated text against its sources.

## 1. Set up the local environment

Install Python 3.11–3.13 and Docker Desktop with Linux containers. Start Docker Desktop and wait until its engine is running. Allow several GB of disk space for images, models, and Python packages. Internet access is required for the initial downloads; subsequent inference and retrieval run locally.

Extract the ZIP and open a terminal in the `contextual-retrieval-solution` folder. On systems that use `python3`, substitute it for `python` below.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
.\setup.ps1
```

If PowerShell blocks activation, use `.\.venv\Scripts\python.exe` in place of `python` and run `powershell -ExecutionPolicy Bypass -File .\setup.ps1` for setup.

**macOS/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
sh setup.sh
```

Setup starts PostgreSQL with pgvector and Ollama, then downloads `all-minilm:22m` for embeddings and `qwen2.5:0.5b` for context, reranking, and answers. PostgreSQL is published at `127.0.0.1:55432` and Ollama at `127.0.0.1:11435`. The Python client uses these IPv4 addresses too, avoiding possible `localhost` IPv6 delays. The database credentials `lab` / `lab` are only for this local exercise.

Check that the services and models are ready:

```bash
docker compose ps
docker compose exec ollama ollama list
```

### Optional: NVIDIA GPU

The default setup uses CPU. If Docker can access a supported NVIDIA GPU, run one of the commands below instead, or rerun setup with the option to recreate Ollama with GPU access. Windows requires Docker Desktop's WSL 2 backend and a compatible NVIDIA driver; Linux requires NVIDIA Container Toolkit. See the [Docker GPU prerequisites](https://docs.docker.com/desktop/features/gpu/) and [Ollama Docker instructions](https://docs.ollama.com/docker). The supplied override is for NVIDIA GPUs.

```powershell
.\setup.ps1 -Gpu
```

On Linux:

```bash
sh setup.sh --gpu
```

After loading a model, check its `PROCESSOR` column for CPU/GPU allocation:

```bash
docker compose exec ollama ollama run qwen2.5:0.5b "Say hello in one sentence."
docker compose exec ollama ollama ps
```

The model may disappear from `ollama ps` after it is unloaded; run the first command again if the list is empty. To use the GPU override when starting containers manually, use `docker compose -f compose.yaml -f compose.gpu.yaml up -d --wait`. To switch back to CPU mode, rerun setup without the GPU option. The named volumes retain the database and models when a container is recreated.

## 2. Explore and split the documents

[Download contextual-retrieval-solution.zip](../course/data/contextual-retrieval-solution.zip)


Open `data/field-guides.md`. This one file contains four fictional field guides, each beginning with a heading such as `# aurora-v1 | Aurora Sensor, version 1 field guide`. Each paragraph becomes one chunk.

The file is generated from the editable `data/documents.json`. To rebuild it, run the following command; it overwrites `data/field-guides.md`:

```bash
python build_documents.py
```

Now split the guides:

```bash
python lab.py --impl solution split
```

For the provided data, expect 12 chunks with IDs such as `aurora-v1-3` and `boreal-v2-2`. Open `solution.py` and find `split_documents()`. It separates the document headings, splits paragraphs at blank lines, and creates an ID, title, paragraph text, and complete source document for each chunk. The complete source is used later for context generation; it is not included in the raw chunk's embedding.

Compare the third paragraphs of the two Aurora guides. Both begin with “The device records one temperature sample,” but the isolated text does not identify the device version. The full document supplies that information. This is the context-loss problem: a relevant paragraph may be hard to find or interpret once separated from its heading.

This lab uses a simple paragraph splitter, no overlap, and Markdown with a known structure. Real documents need choices about chunk size, overlap, tables, and headings. Docling is not required here; the [Docling documentation](https://docling-project.github.io/docling/) shows a Docling-based approach.

**Discuss:** What information would be lost if the paragraph were indexed without its heading? What could go wrong if chunks were much larger or smaller?

## 3. Generate context and store embeddings

Open `prompts/context.txt` and find `contextualize()` in `solution.py`. The runner sends the **whole current guide** and one **specific paragraph** to the local language model. The model is asked to produce a short context describing where that paragraph fits. `lab.py` prepends the generated context to the original paragraph for contextual indexing.

Build the index:

```bash
python lab.py --impl solution ingest
```

The command prints a generated context for each of the 12 chunks. It then creates two 384-dimensional embeddings per chunk using `all-minilm:22m`: one for the original paragraph and one for `context + paragraph`. It creates the pgvector extension and `lab_chunks` table if necessary, and replaces the table contents after model processing succeeds.

Inspect the stored rows:

```bash
docker compose exec db psql -U lab -d contextual_lab -c "SELECT id, context, text FROM lab_chunks ORDER BY id;"
```

Read a generated context alongside its original guide. Does it identify the right product and version? The model may omit or invent details, so context is an indexing aid rather than authoritative evidence. The table also stores the original passage, title, and both vectors. Searches use exact pgvector cosine distance; an approximate vector index is unnecessary for this tiny collection.

In `lab.py`, look at `ingest()` and `embed()` to trace the model calls and SQL inserts. Anthropic's article discusses prompt caching to reduce repeated processing of the full document; this example sends the short guide on each context-generation call and does not implement caching. For a sufficiently small collection that fits in a model's context window, consider whether sending the whole collection directly might be simpler than retrieval.

**Discuss:** How does the context prompt help distinguish two otherwise similar paragraphs? Is every statement in the generated context supported by the source?

## 4. Compare semantic and contextual embeddings

Run the same question against the two vector columns:

```bash
python lab.py --impl solution search "How often does Aurora Sensor version 1 sample temperature?" --mode dense
python lab.py --impl solution search "How often does Aurora Sensor version 1 sample temperature?" --mode context-dense
```

`dense` embeds the question and searches the original paragraph vectors; `context-dense` searches the context-plus-paragraph vectors. Both commands display each result's ID, score, generated context, and original passage. The displayed context is stored metadata even in `dense` mode; it was not used to create that mode's raw vectors.

For this question, compare the returned IDs with `aurora-v1-3`, the paragraph stating a 30-second sampling interval. Rankings and scores can vary with the generated context and local model behavior. Inspect `search()` in `lab.py` to see how it selects `raw_vector` or `contextual_vector` and sorts by cosine distance.

**Discuss:** Did adding context change the ordering? If it did not, can you find another question or a generated context that explains why?

## 5. Compare BM25 and contextual BM25

Run keyword and semantic searches for an exact code:

```bash
python lab.py --impl solution search "AX-14 Aurora Sensor version 2" --mode bm25
python lab.py --impl solution search "AX-14 Aurora Sensor version 2" --mode context-bm25
python lab.py --impl solution search "AX-14 Aurora Sensor version 2" --mode context-dense
```

Read `tokenize()` and `bm25()` in `solution.py`. Tokens are case-insensitive, and identifiers such as `AX-14` remain a single token. BM25 rewards matching terms while accounting for document frequency, repeated terms, and paragraph length. In `context-bm25`, the indexed text contains the generated context as well as the paragraph; in `bm25`, it contains only the paragraph. This small BM25 index is calculated in Python from PostgreSQL rows, not by a PostgreSQL BM25 index.

The relevant version 2 passage is `aurora-v2-2`; version 1 also contains `AX-14` but gives a different instruction. Check the returned paragraphs and generated contexts rather than assuming an exact code is enough to distinguish them.

**Discuss:** Why can a code help keyword search? How might semantic search find a passage when the question uses different words? What happens if generated context names the wrong version?

## 6. Combine rankings with reciprocal rank fusion

```bash
python lab.py --impl solution search "How long can Boreal Gateway version 2 buffer readings while offline?" --mode hybrid
python lab.py --impl solution search "How long can Boreal Gateway version 2 buffer readings while offline?" --mode context-hybrid
```

`hybrid` combines raw dense and raw BM25 rankings. `context-hybrid` combines contextual dense and contextual BM25 rankings. `fuse()` in `solution.py` adds `1 / (60 + rank)` for each appearance of a chunk in the input rankings, with rank starting at 1. A chunk returned by both methods receives both contributions. This works with ranks without adding incompatible cosine and BM25 score scales.

For this question, inspect `boreal-v2-3`, which states that readings are stored locally for 96 hours during an outage. The runner retrieves up to `--candidates` results from each initial search, deduplicates them through fusion, and keeps up to that number as candidates.

**Discuss:** Does combining rankings improve the result for this question? Why might the two retrieval methods contribute different candidates?

## 7. Rerank candidates and generate an answer

Read `prompts/rerank.txt` and `rerank()` in `solution.py`. The reranker sends each candidate, its generated context, and the question to the local language model, asking for a relevance score from 0 to 10. It sorts candidates by those scores. This is pointwise LLM reranking, a local teaching substitute for the separate reranking model used in the article.

Compare the initial fused ranking and the reranked result using the same candidate and result counts:

```bash
python lab.py --impl solution search "How do I resolve BG-27 on Boreal Gateway version 2?" --mode context-hybrid --candidates 6 --top-k 3
python lab.py --impl solution search "How do I resolve BG-27 on Boreal Gateway version 2?" --mode rerank --candidates 6 --top-k 3
```

Now ask for an answer using the reranked passages:

```bash
python lab.py --impl solution answer "How do I resolve BG-27 on Boreal Gateway version 2?" --mode rerank --candidates 6 --top-k 3
```

Open `prompts/answer.txt` to see how the model is asked to use the evidence and cite chunk IDs. Check the cited original passage: `boreal-v2-2` says to update the radio firmware before rebooting. The small model may make mistakes, omit citations, or stop mid-answer when it reaches the output limit. Try a question the guides cannot answer and see whether the model admits insufficient evidence.

**Discuss:** Did reranking change the top results? How long did it take? A reranker can only reorder the candidates it receives; what happens if the relevant chunk never enters that set?

## 8. Evaluate the retrieval methods

Open `data/evaluation.json`. Each entry contains a question and the ID of a labeled relevant chunk. The original dataset has eight questions; if you edit the file, the evaluation uses its current contents. Start with `--top-k 1` and six candidates so the modes are comparable:

```bash
python lab.py --impl solution evaluate --mode dense --top-k 1
python lab.py --impl solution evaluate --mode bm25 --top-k 1
python lab.py --impl solution evaluate --mode hybrid --top-k 1
python lab.py --impl solution evaluate --mode context-dense --top-k 1
python lab.py --impl solution evaluate --mode context-bm25 --top-k 1
python lab.py --impl solution evaluate --mode context-hybrid --top-k 1
python lab.py --impl solution evaluate --mode rerank --top-k 1 --candidates 6
```

The reranking evaluation may make up to six serial model calls per question and can take much longer on a CPU. Each command shows the expected and returned IDs, HIT or MISS, recall, hit rate, and evaluation time. The reported time excludes Python startup; a cold model load can make the first run slower than a warm run. For total command time in PowerShell while still displaying output, use:

```powershell
Measure-Command { python lab.py --impl solution evaluate --mode dense --top-k 1 | Out-Host }
```

**Recall@K** is the fraction of labeled relevant chunks returned in the top K, averaged across questions. **Hit rate@K** is the fraction of questions with at least one labeled relevant chunk returned. They are equal for this dataset when each question has exactly one labeled chunk. Repeat selected comparisons with `--top-k 3`, and inspect at least one HIT and one MISS.

Anthropic reports relative reductions in retrieval failure of 49% for contextual embeddings plus contextual BM25 and 67% when reranking is added in its own experiments. The article used different models, data, and evaluation settings. This tiny hand-labeled set cannot reproduce or establish those results; contextualization and reranking can also make individual results worse. The evaluation measures retrieval of labeled chunks, not whether a generated answer is correct.

## What to submit

1. A table of recall@1 and approximate evaluation time for the seven modes, plus selected recall@3 results. Note whether model runs were cold or warm.
2. One raw paragraph and its generated context, with an explanation of whether the context is supported by its source.
3. One HIT and one MISS, including the expected and returned IDs and a possible explanation.
4. An answer with its cited IDs, checked against the original passages.
5. A short discussion of chunking, semantic versus keyword search, rank fusion, reranking latency, prompt caching, and the limits of this evaluation.

## Troubleshooting and cleanup

- For a stronger local language model, run `docker compose exec ollama ollama pull qwen2.5:1.5b`, then set `LAB_CHAT_MODEL` to `qwen2.5:1.5b` (`$env:LAB_CHAT_MODEL='qwen2.5:1.5b'` in PowerShell or `export LAB_CHAT_MODEL=qwen2.5:1.5b` in macOS/Linux). Rerun ingestion to regenerate context. Larger models need more memory and time. The embedding model is fixed at 384 dimensions; replacing it requires a compatible schema and re-ingestion.
- If a port is already occupied, inspect `docker ps`, then stop or reconfigure the conflicting service, or change the host port in `compose.yaml` and the matching `LAB_DATABASE_URL` or `LAB_OLLAMA_URL`. Use `127.0.0.1` for IPv4 loopback when setting those URLs.
- For service or model errors, check `docker compose ps`, `docker compose logs db`, and `docker compose logs ollama`; ensure Docker Desktop is running and rerun setup if models are missing.
- If reranking reports that the model returned no 0–10 score, retry or use the larger local model above; the tiny model does not always follow the scoring prompt.
- If you change the source document, context prompt, or splitting behavior, rerun ingestion. Paragraph or document ID changes may also require updating `data/evaluation.json`.
- Stop the lab containers with `docker compose down`. Named volumes retain the database and downloaded models. `docker compose down -v` also deletes those volumes and requires downloading the models again.

## References

- [Anthropic: Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)
- [pgvector](https://github.com/pgvector/pgvector)
- [Ollama all-minilm](https://ollama.com/library/all-minilm) and [Qwen 2.5](https://ollama.com/library/qwen2.5)
