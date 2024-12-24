FROM apache/airflow:slim-2.10.4-python3.12
ENV PYTHONUNBUFFERED=1

# ========================
# Create Airflow folders
# ========================
USER root
RUN mkdir -p /sources/logs /sources/dags /sources/plugins
RUN chmod 777 /sources/{logs,dags,plugins}
RUN chown -R "0:0" /sources/{logs,dags,plugins}
RUN chmod 777 -R /tmp
RUN mkdir -p /logs
RUN chmod 777 -R /logs

# ========================
# Install pkgs
# ========================

# Update ----------------------------------------
RUN apt-get update

# Add mysql-client -------------------------------
RUN apt-get install -y default-mysql-client

# Add git ---------------------------------------
RUN apt-get install -y git
RUN git config --global --add safe.directory /src

# Add graphviz ----------------------------------
RUN apt-get install -y gcc
RUN apt-get install -y libgraphviz-dev
RUN apt-get install -y graphviz

# Add python pkgs -------------------------------
USER airflow
COPY ./requirements.txt /project-requirements.txt
COPY ./airflow/requirements.txt /airflow-requirements.txt

RUN pip install -U pip
RUN pip install --upgrade setuptools
RUN pip install -r /project-requirements.txt
RUN pip install -r /airflow-requirements.txt
