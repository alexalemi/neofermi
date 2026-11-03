# How many GPU-hours did it take to train Llama 2?

FLOP and FLOP/s are units like any other, so a training budget falls out of the model size and the hardware spec. Then a function reuses the same reasoning to check a second, much larger model.

## Where the 6 comes from

Each parameter in a transformer takes part in one multiply and one add for every token that passes through it: 2 operations in the forward pass. Backpropagation computes two gradients per parameter (one for the weights, one to pass back to the layer below), each costing as much as the forward pass. That's 2 + 4 = 6 FLOP per parameter per token.

```
forward = 2 FLOP
backward = 2 * forward
per_param_token = forward + backward
```

Meta's Llama 2 70B has 70 billion parameters and was trained on 2 trillion tokens.

```
params = 70 billion
tokens = 2 trillion
compute = per_param_token * params * tokens
```

That's ${compute}.

## From FLOP to GPU-hours

Meta trained on NVIDIA A100s, rated at 312 TFLOP/s for the bf16 matrix math training uses. No real training run gets the rated peak. Time goes to moving data between GPUs, waiting on memory, the parts of the network that aren't matrix multiplies, and restarting after hardware failures. Large runs typically get 35% to 55% of peak; the fraction is called model FLOP utilization.

```
a100 = 312 TFLOP/s
utilization = 35% to 55%
gpu_time = compute / (a100 * utilization)
gpu_time as million hour
```

FLOP divided by FLOP per second leaves seconds, and `as million hour` puts it in the units the papers report.

## The same reasoning, as a function

To check the method rather than one lucky answer, wrap it in a function and try another model. The function uses the same `utilization` range as above. Llama 3.1 405B was trained on 15.6 trillion tokens on H100s, rated at 989 TFLOP/s in bf16.

```
gpu_hours(params, tokens, peak) = 6 FLOP * params * tokens / (peak * utilization) as million hour
h100 = 989 TFLOP/s
llama3 = gpu_hours(405 billion, 15.6 trillion, h100)
```

## How close is it?

The Llama 2 paper reports **1.72 million GPU-hours** for the 70B model ([Touvron et al. 2023, Table 2](https://arxiv.org/abs/2307.09288)). The estimate is ${gpu_time as million hour}.

Meta's model card reports **30.84 million GPU-hours** for Llama 3.1 405B ([Hugging Face](https://huggingface.co/meta-llama/Llama-3.1-405B)), against an estimate of ${llama3}. The 6-FLOP rule is close to exact for models this size, so nearly all the uncertainty is in utilization. Run backwards, the reported numbers imply Meta got about 43% on Llama 2 and about 35% on the much larger, harder-to-parallelize Llama 3.1.
