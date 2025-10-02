# VoiceLoopHR: AWS Infrastructure & Open-Source AI Developer Instructions

## 1. Objective

Transition VoiceLoopHR to a self-hosted, open-source AI backend on AWS. Eliminate OpenAI API key dependency for LLM, STT, and TTS. Maintain performance, ensure scalability, and optimize cost.

## 2. AWS Infrastructure Setup

### 2.1. Core Compute for LLM, STT, TTS Inference

*   **Instance Type:** Deploy G5 EC2 instances (e.g., `g5.xlarge`, `g5.2xlarge`, `g5.4xlarge`) for GPU-accelerated inference. These instances feature NVIDIA A10G Tensor Core GPUs.
*   **Scalability:** Configure AWS Auto Scaling Groups for EC2 instances based on demand.
*   **Cost Optimization:** Utilize EC2 Spot Instances for non-critical workloads. Consider Reserved Instances for predictable base loads.
*   **Deployment:** Use vLLM for optimized LLM serving on EC2 [1, 2]. Expose inference endpoints via FastAPI.
*   **Alternative (Managed):** Evaluate Amazon SageMaker for simplified deployment and scaling of open-source LLMs, noting potential cost implications and reduced granular control [6].

### 2.2. Data Storage & Management (RAG Components)

*   **Vector Database:** Use Amazon RDS for PostgreSQL with `pg_vector` extension. Configure for scalability (read replicas) and high availability (Multi-AZ deployment).
*   **Document Storage:** Store raw documents (PDFs, DOCX, XLSX) in Amazon S3. Ensure proper integration for ingestion/retrieval and configure security features.

### 2.3. Networking & Security

*   **VPC:** Deploy all resources within an Amazon VPC. Use public subnets for load balancers and private subnets for EC2 (LLM/STT/TTS) and RDS instances.
*   **Security:** Implement strict Security Groups and Network ACLs.
*   **Load Balancing:** Use Application Load Balancers (ALB) for traffic distribution and SSL/TLS termination.
*   **Certificates:** Manage SSL/TLS certificates via AWS Certificate Manager (ACM).

### 2.4. Containerization & Orchestration

*   **Containerization:** Dockerize LLM, STT, and TTS inference services.
*   **Orchestration:** Deploy containers on Amazon ECS or EKS. Ensure GPU support is configured for chosen compute instances.

### 2.5. Monitoring & Logging

*   **Monitoring:** Use Amazon CloudWatch for metrics, logs, and alarms.
*   **Tracing:** Implement AWS X-Ray for end-to-end request tracing.

### 2.6. Cost Optimization

*   **Right-Sizing:** Continuously right-size instances.
*   **Spot Instances:** Use for stateless inference.
*   **Reserved Instances/Savings Plans:** Apply for predictable workloads.
*   **S3 Tiering:** Use S3 Intelligent-Tiering for document storage.
*   **Budget Alerts:** Set up AWS Budgets.

### 2.7. Maintenance & Operations

*   **IaC:** Manage infrastructure with AWS CloudFormation or Terraform.
*   **CI/CD:** Implement CI/CD pipelines (e.g., AWS CodePipeline) for automated deployments.
*   **Updates:** Establish processes for regular model and dependency updates.

## 3. Open-Source AI Engine Integration

### 3.1. Speech-to-Text (STT) Engine

*   **Engine:** OpenAI Whisper [7].
*   **Deployment:** Deploy locally on AWS EC2 GPU instances or within a containerized environment (ECS/EKS).
*   **Function:** Convert user voice input to text for the RAG pipeline.

### 3.2. Text-to-Speech (TTS) Engine

*   **Engine:** Coqui TTS (XTTS-v2) [11, 12].
*   **Deployment:** Deploy on AWS EC2 GPU instances or within a containerized environment (ECS/EKS).
*   **Function:** Convert LLM text responses to audio for user output.

## 4. References

1.  [Serving LLMs using vLLM and Amazon EC2 instances with AWS AI chips](https://aws.amazon.com/blogs/machine-learning/serving-llms-using-vllm-and-amazon-ec2-instances-with-aws-ai-chips/)
2.  [Self host LLM with EC2, vLLM, Langchain, FastAPI ...](https://medium.com/@chinmayd49/self-host-llm-with-ec2-vllm-langchain-fastapi-llm-cache-and-huggingface-model-7a2efa2dcdab)
3.  [What\'s the recommended or cheapest way to host open ...](https://www.reddit.com/r/aws/comments/1jq7ye8/whats_the_recommended_or_cheapest_way_to_host/)
4.  [AWS GPU instances that can handle micro LLMs](https://www.reddit.com/r/LocalLLM/comments/18kd7lb/aws_gpu_instances_that_can_handle_micro_llms/)
5.  [Amazon EC2 G5 Instances](https://aws.amazon.com/ec2/instance-types/g5/)
6.  [Optimize price-performance of LLM inference on NVIDIA ...](https://aws.amazon.com/blogs/machine-learning/optimize-price-performance-of-llm-inference-on-nvidia-gpus-using-the-amazon-sagemaker-integration-with-nvidia-nim-microservices/)
7.  [OpenAI Whisper](https://openai.com/research/whisper)
8.  [Vosk Speech Recognition](https://alphacephei.com/vosk/)
9.  [Mozilla DeepSpeech GitHub](https://github.com/mozilla/DeepSpeech)
10. [Hugging Face Wav2vec2](https://huggingface.co/docs/transformers/model_doc/wav2vec2)
11. [Coqui TTS GitHub](https://github.com/coqui-ai/TTS)
12. [Best open source text-to-speech models and how to run them](https://northflank.com/blog/best-open-source-text-to-speech-models-and-how-to-run-them)
13. [Bark (Hugging Face)](https://huggingface.co/suno/bark)
14. [MeloTTS GitHub](https://github.com/myshell-ai/MeloTTS)
15. [Piper TTS GitHub](https://github.com/rhasspy/piper)

