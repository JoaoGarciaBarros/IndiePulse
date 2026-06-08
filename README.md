# Documentação IndiePulse 

# **Arquitetura Haiku**

## **Objetivo**

* criar um ambiente propício para que estúdios com baixo orçamento possam manter uma alta qualidade nas suas produções.  
* a comunidade participando ativamente nesse processo.  
* redução de 40% no tempo de identificação de bugs críticos.

---

## **Requisitos Funcionais**

### **Dashboards devs**

* Visualizações contextualizadas de dados de erros.  
* Categorizar erros por locais e/ou quantidade de reports iguais.  
* Desenvolvidos para análises críticas detalhadas e precisas.

### **"Playtesting" ao vivo**

* Rodar em nuvem, sem precisar de download.  
* Garantir que esteja atualizado.  
* disponibilizar maneiras de reportar erros.

---

## **Escopo**

* Permitir que jogadores testem jogos via navegador.  
* Coletar relatórios de bugs e telemetria.  
* Disponibilizar dashboards para análise dos desenvolvedores.

## **Fora do escopo**

* Publicação de jogos.  
* Marketplace de jogos.

---

## **Restrições Técnicas**

* RODAR EM NUVEM, para alcançar uma variedade maior de público.  
* Gerenciar arquivos de erros, exemplo:  
  * Descrição do erro (feita pelo jogador).  
  * print ou gravação de segundos antes (feitas pelo sistema).  
  * Envio de métricas do erro (feitas pelo sistema).  
* Garantir segurança e privacidade dos desenvolvedores.

---

## **Atributos de Qualidade**

Priorizados da seguinte forma:

1. **Confidencialidade**: proteger informações sensíveis e garantir conformidade regulatória.  
2. **Usabilidade**: intuitivo e fácil de usar.  
3. **Confiabilidade**: assegurar estabilidade do sistema e operação consistente.

---

## **Decisões de Design**

### **Tecnologias Escolhidas**

* **WebRTC:** Para garantir latência mínima no streaming de feedback.  
* **Node.js/TypeScript:** Escalabilidade e facilidade na manipulação de eventos em tempo real.  
* **AWS (ECS/Fargate):** Para escalar instâncias de jogos conforme a demanda dos testes.

---

## **Arquitetura de Dados do Sistema**

### **Camada Frontend**

* **Web App (React/Next.js):** Interface para usuários e dashboard de devs

### **Camada comunicação**

* **API Gateway (Node.js):** Orquestração de serviços.

### **Camada Backend**

* **Streaming Engine (WebRTC):** Responsável pelo "Playtesting" ao vivo sem download.  
* **Database (PostgreSQL):** Armazenamento de telemetria e dados de usuários.

---

## **Autenticação**

* Implementação de autenticação via Google/GitHub para acesso seguro e simplificado dos usuários.

---

## 

## **Caso de uso atual**

Exemplo:

#### **Caso de Uso 01 – Reportar Bug**

**Ator:** Jogador

Fluxo:

1. O jogador encontra um erro.  
2. Clica em "Reportar Bug".  
3. Sistema captura:  
   * descrição;  
   * screenshot / vídeo dos últimos segundos;  
   * métricas do jogo.  
4. Dados são enviados para o backend.  
5. O Desenvolvedor recebe o relatório.

