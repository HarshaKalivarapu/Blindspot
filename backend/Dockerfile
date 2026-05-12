FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nmap \
    nikto \
    whatweb \
    hydra \
    ffuf \
    dnsutils \
    whois \
    openssl \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["uvicorn", "orchestrator:app", "--host", "0.0.0.0", "--port", "5000"]
