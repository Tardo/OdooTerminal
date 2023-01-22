# Copyright  Alexandre Díaz <dev@redneboa.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import time
import urllib.parse
import pytest
from python_on_whales import DockerClient


def pytest_addoption(parser):
    parser.addoption('--browser', action='store', default='firefox')
    parser.addoption('--odoo-version', action='store', default='11')

@pytest.fixture(scope='session')
def docker_compose(pytestconfig):
    odoo_ver = pytestconfig.getoption('odoo_version')
    docker = DockerClient(compose_files=['./tests/docker/docker-compose.yaml'])
    docker.compose.build(build_args={
        'ODOO_VERSION': f'{odoo_ver}.0',
    })
    docker.compose.up(detach=True)
    docker.compose.run('odoo', command=['addons', 'init', '-w', 'base,bus,sale_management,barcodes,sms'], remove=True)
    docker.compose.restart(services=['odoo'])
    time.sleep(10)   # Wait for Odoo service
    yield docker
    docker.compose.rm(stop=True, volumes=True)

@pytest.fixture(scope='session')
def construct_url():
    def _run(relative_path=''):
        base_url = urllib.parse.urljoin('http://localhost:8069', relative_path)
        return base_url
    return _run
