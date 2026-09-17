# Running ata-order-web on Kubernetes (minikube)

This guide takes you from a stopped machine to the Order Search page open in
your browser, served from a local [minikube](https://minikube.sigs.k8s.io/)
cluster using the manifests in [`k8s/`](k8s/).

| File | What it creates |
|------|-----------------|
| [`k8s/deployment.yaml`](k8s/deployment.yaml) | Deployment `order-web`: 2 replicas of image `ata-order-web:<tag>`, nginx on port 80, readiness/liveness probes on `GET /` |
| [`k8s/service.yaml`](k8s/service.yaml) | Service `order-web` of type `NodePort`: port 80 inside the cluster, node port `30081` |

The image is never pushed to a registry. You build it locally and load it
straight into minikube, which is why the Deployment uses
`imagePullPolicy: IfNotPresent`.

Commands below work in both PowerShell and Git Bash unless noted.

## How it fits together

```
browser ──► order-web (nginx :80) ──/api/──► salary-app (Spring Boot :8080)
            this repo                        ata-salary-services repo
```

The web app does not work on its own in the cluster. nginx forwards every
`/api/` request to the `salary-app` Service, and **nginx refuses to start if
it cannot find `salary-app`**. Deploy the backend first (step 3).

## 1. Prerequisites

Install these once:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), running
- [minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

Check them:

```bash
docker version
```

```bash
minikube version
```

```bash
kubectl version --client
```

No local Node.js is needed. The [`Dockerfile`](Dockerfile) builds the app
inside the image.

## 2. Start the cluster

If the cluster already exists, this starts it again with its images and
deployments still in place:

```bash
minikube start --driver=docker --cpus=4 --memory=4096
```

`--cpus` and `--memory` only take effect when the cluster is first created.
The backend needs most of that; order-web asks for just 50m CPU and 32Mi
memory per pod.

Confirm kubectl is talking to minikube:

```bash
kubectl config current-context
```

```bash
kubectl get nodes
```

You should see one node named `minikube` with status `Ready`.

Already deployed before? Check what is running:

```bash
kubectl get deploy,svc
```

If both `order-web` and `salary-app` show `READY` pods, skip to
[step 6](#6-open-the-app).

## 3. Deploy the backend first

Follow `readme_k8s.md` in the `ata-salary-services` repo (steps 3 and 4).
Then check it is running:

```bash
kubectl rollout status deployment/salary-app
```

```bash
kubectl get service salary-app
```

## 4. Build the image and load it into minikube

From this project root. Pick a tag. This guide uses `1.3`:

```bash
docker build -t ata-order-web:1.3 .
```

The build bakes in `VITE_API_BASE_URL=/api`, which turns the mock backend
off and sends API calls to nginx. Don't build `dist/` yourself with
`npm run build`. That takes its settings from `.env` instead.

minikube runs its own container runtime, so an image in your local Docker
is not visible to the cluster until you load it:

```bash
minikube image load ata-order-web:1.3
```

Check that it arrived:

```bash
minikube image ls
```

Look for `docker.io/library/ata-order-web:1.3` in the list.

## 5. Deploy

**First, make sure the `image:` line in
[`k8s/deployment.yaml`](k8s/deployment.yaml) has the tag you just built**
(`image: ata-order-web:1.3`). If the tags differ, Kubernetes looks for an
image that isn't in minikube and the pods fail with `ErrImagePull`.

```bash
kubectl apply -f k8s/
```

```bash
kubectl rollout status deployment/order-web
```

```bash
kubectl get pods -l app=order-web
```

Both pods should show `READY 1/1` and `STATUS Running`. nginx starts in
about a second.

## 6. Open the app

With the Docker driver on Windows (and macOS), your computer can't reach the
minikube node IP. That means `http://<minikube ip>:30081` won't load. Use one
of these instead.

### Option A: port-forward (simplest)

```bash
kubectl port-forward service/order-web 8081:80
```

Leave it running and open <http://localhost:8081> in your browser.

Port `8081` avoids a clash with the backend guide, which forwards
`salary-app` to `8080`. Any free local port works.

`port-forward` sends all traffic to a single pod.

### Option B: minikube service tunnel

```bash
minikube service order-web --url
```

It prints a URL such as `http://127.0.0.1:54321`. Keep that terminal open
and browse to the printed URL. This goes through the Service, so requests are
spread across both pods.

### Check the API proxy

With port-forward from option A running:

```bash
curl "http://localhost:8081/api/orders?page=0&size=5"
```

You should get JSON starting with `{"content":[...`. That response came from
`salary-app` through nginx. In PowerShell, use `curl.exe` instead of `curl`.

## 7. Deploy a new version

The Deployment uses a fixed tag with `IfNotPresent`. If you rebuild under the
same tag, the running pods don't change. Use a new tag each time:

```bash
docker build -t ata-order-web:1.4 .
```

```bash
minikube image load ata-order-web:1.4
```

```bash
kubectl set image deployment/order-web order-web=ata-order-web:1.4
```

```bash
kubectl rollout status deployment/order-web
```

Then update the `image:` line in [`k8s/deployment.yaml`](k8s/deployment.yaml)
to match. Otherwise the next `kubectl apply -f k8s/` rolls the cluster back
to the old tag. Undo a bad rollout with:

```bash
kubectl rollout undo deployment/order-web
```

Check which image the pods are actually running:

```bash
kubectl get rs -l app=order-web -o wide
```

## 8. Everyday commands

| Task | Command |
|------|---------|
| List pods | `kubectl get pods -l app=order-web -o wide` |
| List pods with IMAGES column | `kubectl get rs -l app=order-web -o wide` |
| Logs of one pod (nginx access log) | `kubectl logs <pod-name>` |
| Follow logs of all pods | `kubectl logs -f -l app=order-web --prefix` |
| Pod details and events | `kubectl describe pod <pod-name>` |
| Shell inside a pod | `kubectl exec -it <pod-name> -- sh` |
| Call the backend from inside a pod | `kubectl exec deploy/order-web -- wget -qO- http://salary-app/api/orders` |
| Point `/api/` at another backend | `kubectl set env deployment/order-web API_UPSTREAM=http://other-service` |
| Scale replicas | `kubectl scale deployment/order-web --replicas=3` |
| Restart all pods | `kubectl rollout restart deployment/order-web` |
| Kubernetes dashboard | `minikube dashboard` |

`kubectl scale` and `kubectl set env` change only the live cluster. The next
`kubectl apply -f k8s/` puts back the replica count from the YAML.

Inside a pod, use `127.0.0.1` rather than `localhost`. The Alpine image
resolves `localhost` to IPv6, but nginx listens only on IPv4.

## 9. Stop and clean up

Remove the web app but keep the cluster (and the backend):

```bash
kubectl delete -f k8s/
```

Stop the cluster. It keeps its state and loaded images for next time:

```bash
minikube stop
```

Next time, run `minikube start` and everything you deployed comes back. You
only need to rebuild and reload the image if the code changed.

Delete the cluster entirely (removes loaded images and the backend too):

```bash
minikube delete
```

## Troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| `ErrImagePull` / `ImagePullBackOff` | The image isn't in minikube, so Kubernetes tried Docker Hub. Run `minikube image load ata-order-web:<tag>` and check the tag matches the Deployment exactly. |
| `CrashLoopBackOff`, log says `host not found in upstream "salary-app"` | The backend Service doesn't exist yet. Deploy `salary-app` (step 3), then `kubectl rollout restart deployment/order-web`. |
| Page loads but the table shows an error | The backend is down or out of date. Run `kubectl exec deploy/order-web -- wget -qO- http://salary-app/api/orders`. A 404 means the backend image is older than the orders endpoint, so rebuild and roll out `ata-salary-services`. |
| Table shows mock data, or requests go to `localhost:8080` | The image contains a `dist/` that `docker build` didn't produce. Rebuild with `docker build` under a new tag. |
| `http://<minikube ip>:30081` times out | Expected with the Docker driver on Windows/macOS. Use port-forward or `minikube service` (step 6). |
| `port-forward` fails with `address already in use` | Something already uses that local port. Pick another, e.g. `kubectl port-forward service/order-web 8082:80`. |
| New code not showing after rebuild | The tag didn't change, so pods still run the old image. See step 7. Also hard-refresh the browser (Ctrl+F5). |
| `kubectl` talks to the wrong cluster | Run `kubectl config use-context minikube`. |
