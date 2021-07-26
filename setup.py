from setuptools import setup, find_packages

with open('requirements.txt') as f:
	install_requires = f.read().strip().split('\n')

# get version from __version__ variable in crew_management/__init__.py
from crew_management import __version__ as version

setup(
	name='crew_management',
	version=version,
	description='An application for the management of  Field Installation technicians',
	author='Zirrus One',
	author_email='info@zirrusone.com',
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
