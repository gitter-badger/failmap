import logging

from django.core.cache import cache
from django.core.management.base import BaseCommand


logger = logging.getLogger(__package__)


class Command(BaseCommand):
    help = 'Clear all caches'

    def handle(self, *args, **options):
        logger.warning('This does not clear your browsers chache. For JSON this might be relevant.')
        cache.clear()